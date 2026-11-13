import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { execFileSync, spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:https";
import { request as forward } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { prisma } from "../lib/db/prisma";
import { allowedMonths, archiveMonthly, monthBounds, reportContent, reportFingerprint, saveMonthlyDraft } from "../lib/services/monthly-report-service";
import { saveExternalItems } from "../lib/services/external-tracking-service";
import { claudeOrigin } from "../lib/integrations/claude-origin";
import manifest from "../mcp/manifest.json";

const password = "temporary-recipe-" + randomBytes(12).toString("hex");
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const command = "./node_modules/.bin/tsx";

function runInstance(https: boolean, directory: string) {
  const plain = https ? "http://127.0.0.1:3000" : "http://localhost:3080";
  const url = https ? "https://localhost:3443" : plain;
  const env = { ...process.env, CIO_PUBLIC_URL: url, ENTRA_TENANT_ID: "", ENTRA_CLIENT_ID: "", ENTRA_CLIENT_SECRET: "" };
  const caFile = join(directory, "certificate.pem");
  const keyFile = join(directory, "key.pem");
  let tls: ReturnType<typeof createServer> | undefined;
  if (https) {
    execFileSync("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-days", "1", "-subj", "/CN=localhost",
      "-addext", "subjectAltName=DNS:localhost", "-keyout", keyFile, "-out", caFile], { stdio: "ignore" });
    tls = createServer({ key: readFileSync(keyFile), cert: readFileSync(caFile) }, (req, res) => {
      const proxy = forward(plain + req.url, { method: req.method, headers: { ...req.headers, "x-forwarded-proto": "https" } }, (upstream) => {
        res.writeHead(upstream.statusCode ?? 502, upstream.headers);
        upstream.pipe(res);
      });
      proxy.on("error", () => { res.writeHead(502); res.end(); });
      req.pipe(proxy);
    });
    tls.listen(3443);
  }
  const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--port", new URL(plain).port], { env, stdio: "inherit" });
  return {
    url,
    caFile: https ? caFile : "",
    app: (path: string, init: RequestInit = {}) => fetch(plain + path, { ...init, redirect: "manual" }),
    close: async () => {
      tls?.close();
      if (server.exitCode === null && server.signalCode === null) {
        server.kill("SIGTERM");
        await once(server, "exit");
      }
    }
  };
}

type Instance = ReturnType<typeof runInstance>;

async function waitForApp(app: Instance["app"]) {
  for (let index = 0; index < 50; index++) {
    if (await app("/login").then((res) => res.ok).catch(() => false)) return;
    await new Promise((done) => setTimeout(done, 250));
  }
  throw new Error("Next.js did not start");
}

async function launchExtension(app: Instance["app"], headers: HeadersInit, directory: string, url: string, token: string, caFile = "") {
  const extension = await app("/api/integrations/claude/extension", { headers });
  assert.equal(extension.status, 200);
  assert.match(extension.headers.get("content-disposition") ?? "", /cio-assistant\.mcpb/);
  const archive = join(directory, "cio-assistant.mcpb");
  writeFileSync(archive, Buffer.from(await extension.arrayBuffer()));
  execFileSync("python3", ["-m", "zipfile", "-e", archive, directory]);
  const installed = JSON.parse(readFileSync(join(directory, "manifest.json"), "utf8")) as typeof manifest;
  assert.deepEqual(installed, manifest);
  assert.equal(installed.user_config.cio_token.sensitive, true);
  assert.equal(installed.user_config.cio_url.default, "http://localhost:3000");
  const values: Record<string, string> = { cio_url: url, cio_token: token, ca_file: caFile };
  const config = installed.server.mcp_config;
  const args = config.args.map((value) => value.replaceAll("${__dirname}", directory));
  const env = Object.fromEntries(Object.entries(config.env).map(([key, value]) => [key, value.replace(/\$\{user_config\.(\w+)\}/g, (_, field: string) => values[field])]));
  const node = process.env.CIO_VERIFY_MCP_NODE || config.command;
  const client = new Client({ name: "cio-docker-recipe", version: "1.0.0" });
  try {
    await client.connect(new StdioClientTransport({ command: node, args, env }));
    assert.deepEqual(client.getServerVersion(), { name: installed.name, version: installed.version });
  } catch (error) {
    await client.close();
    throw error;
  }
  return { client, args, env, node };
}

async function login({ app, url }: Instance, candidate: string) {
  return app("/api/auth/local", { method: "POST", headers: { Origin: url }, body: new URLSearchParams({ password: candidate }) });
}

async function createToken(app: Instance["app"], headers: HeadersInit) {
  const response = await app("/api/integrations/claude", { method: "POST", headers, body: JSON.stringify({ label: "Recette MCP" }) });
  assert.equal(response.status, 201);
  return (await response.json()).token as string;
}

async function call(client: Client, name: string, args: Record<string, unknown>, error = false) {
  const result = await client.callTool({ name, arguments: args });
  assert.equal(Boolean(result.isError), error, JSON.stringify(result));
  const content = result.content as Array<{ text: string }>;
  return JSON.parse(content[0].text);
}

async function verifyShared(directory: string) {
  const instance = runInstance(true, directory);
  const { app, url, caFile } = instance;
  let client: Client | undefined;
  try {
    await waitForApp(app);
    assert.equal((await app("/api/actions")).status, 401);
    assert.equal((await app("/api/auth/entra/start")).status, 307);

    for (let index = 0; index < 8; index++) assert.equal((await login(instance, "wrong")).headers.get("set-cookie"), null);
    assert.equal((await login(instance, password)).headers.get("set-cookie"), null);
    await prisma.loginAttempt.deleteMany();
    const logged = await login(instance, password);
    const session = logged.headers.get("set-cookie")?.split(";")[0];
    assert(session, "Local fallback login failed");
    const dsi = { Cookie: session, Origin: url, "Content-Type": "application/json" };
    const dsiId = "local-dsi";
    const apprentice = await prisma.user.create({ data: { name: "Apprenti Recette", email: "apprenti-recette@example.test", enabled: true } });
    const apprenticeSecret = randomBytes(32).toString("base64url");
    await prisma.session.create({ data: { hash: hash(apprenticeSecret), userId: apprentice.id, expiresAt: new Date(Date.now() + 3600000) } });
    const restricted = { Cookie: `cio_session=${apprenticeSecret}`, Origin: url, "Content-Type": "application/json" };
    for (const page of ["/actions?view=kanban", "/roadmap", "/services", "/weekly-review"]) assert.equal((await app(page, { headers: restricted })).status, 200, page);
    assert.equal((await app("/settings/integrations", { headers: restricted })).status, 303);
    assert.equal((await app("/api/reports/markdown", { headers: restricted })).status, 403);
    const newAction = await app("/api/actions", { method: "POST", headers: restricted, body: JSON.stringify({ title: "Action recette apprenti", ownerId: dsiId }) });
    assert.equal(newAction.status, 201);
    const own = (await newAction.json()).data;
    assert.equal(own.ownerId, apprentice.id);
    const another = await prisma.action.create({ data: { title: "Action recette DSI", ownerId: dsiId } });
    const patch = (id: string, body: object, headers = restricted) => app(`/api/actions/${id}`, { method: "PATCH", headers, body: JSON.stringify(body) });
    assert(!(await patch(another.id, { status: "DONE" })).ok);
    assert(!(await patch(own.id, { ownerId: dsiId })).ok);
    assert((await patch(own.id, { status: "DONE" })).ok);
    const initialClose = (await prisma.action.findUniqueOrThrow({ where: { id: own.id } })).completedAt;
    assert(initialClose);
    assert((await patch(own.id, { status: "DONE" })).ok);
    assert.deepEqual((await prisma.action.findUniqueOrThrow({ where: { id: own.id } })).completedAt, initialClose);

    const project = await prisma.project.create({ data: { title: "Recette projet", type: "SUPPORT", status: "ACTIVE" } });
    const service = await prisma.supportService.create({ data: { title: "Recette service", criticality: "CRITICAL" } });
    const control = await app(`/api/services/${service.id}/controls`, { method: "POST", headers: { Cookie: restricted.Cookie, Origin: url },
      body: new URLSearchParams({ checkedAt: "2026-01-01", nextDueAt: "2026-01-05", result: "ANOMALY", evidence: "Résultat recette" }) });
    assert.equal(control.status, 303);
    const csv = (mode: string, lines: string, target: { serviceId?: string; projectId?: string } = { serviceId: service.id }) => app("/api/integrations/tickets", { method: "POST", headers: dsi, body: JSON.stringify({
      mode, csv: "id;titre;statut;majeur\n" + lines, ...target, sourceName: "Recette CSV", mapping: { id: 0, title: 1, status: 2, major: 3 }, statuses: [{ original: "Bloqué", status: "BLOCKED" }]
    }) });
    assert.equal((await csv("preview", "T1;Ticket un;Bloqué;oui\nT2;Ticket deux;Ouvert;non")).status, 200);
    assert.equal((await csv("import", "T1;Ticket un;Bloqué;oui\nT2;Ticket deux;Ouvert;non")).status, 200);
    const untouched = await prisma.externalItem.findFirstOrThrow({ where: { externalId: "T2", source: { serviceId: service.id } } });
    assert.equal((await csv("import", "T1;Ticket modifié;Bloqué;oui")).status, 200);
    assert.equal((await prisma.externalItem.findUniqueOrThrow({ where: { id: untouched.id } })).lastSyncedAt.getTime(), untouched.lastSyncedAt.getTime());
    assert.equal((await csv("import", "T3;Ancien import projet;Ouvert;non", { projectId: project.id })).status, 200);
    const plannerItem = { externalId: "P1", title: "Planner recette", status: "TODO" as const, originalStatus: null, assignees: "", priority: null, dueDate: null, progress: null, url: null };
    await saveExternalItems({ kind: "PLANNER", key: "recipe-planner", title: "Plan recette", projectId: project.id }, [plannerItem]);
    await new Promise((done) => setTimeout(done, 3));
    await saveExternalItems({ kind: "PLANNER", key: "recipe-planner", title: "Plan recette", projectId: project.id }, [{ ...plannerItem, externalId: "P2" }]);
    assert.equal(await prisma.externalItem.count({ where: { source: { key: "recipe-planner" }, externalId: "P1" } }), 0);
    assert((await (await app("/weekly-review", { headers: dsi })).text()).includes("Ticket modifié"));

    const token = await createToken(app, dsi);
    ({ client } = await launchExtension(app, dsi, directory, url, token, caFile));
    const tools = await client.listTools();
    assert.equal(tools.tools.length, 34);
    const batch = {
      key: "meeting-recipe-1", meeting: { title: "Réunion de recette MCP", rawContent: "Compte rendu de recette.", projectId: project.id, meetingDate: new Date().toISOString() },
      actions: [{ title: "Action de recette liée", ownerId: apprentice.id, status: "BLOCKED" }],
      risks: [{ title: "Risque de recette lié" }], decisions: [{ subject: "Décision de recette liée" }]
    };
    const first = await call(client, "enregistrer_compte_rendu", batch);
    assert.equal(first.data.saved.length, 4);
    assert.deepEqual(await call(client, "enregistrer_compte_rendu", batch), first);
    const [meeting, action, risk, decision] = first.data.saved;
    assert.equal(await prisma.meetingNote.count({ where: { title: batch.meeting.title } }), 1);
    for (const row of [action, risk, decision]) {
      assert.equal(row.data.meetingNoteId, meeting.id);
      assert(row.url.startsWith(url));
    }
    await call(client, "modifier_action", { key: "action-recipe-1", id: action.id, fields: { title: "Action modifiée par MCP" } });
    assert((await (await app("/", { headers: dsi })).text()).includes("Action modifiée par MCP"));
    await prisma.project.create({ data: { title: "Recette projet homonyme", type: "SUPPORT" } });
    const ambiguous = await call(client, "enregistrer_compte_rendu", { ...batch, key: "ambiguous-recipe", meeting: { ...batch.meeting, projectId: null, projectName: "Recette projet" } }, true);
    assert.equal(ambiguous.candidates.length, 2);
    assert.equal(await prisma.meetingNote.count({ where: { title: batch.meeting.title } }), 1);

    const month = allowedMonths()[1];
    const period = monthBounds(month);
    assert.equal(monthBounds("2026-04").gte.toISOString(), "2026-03-31T22:00:00.000Z");
    for (let i = 0; i < 7; i++) await prisma.action.create({ data: { title: `Clôture recette ${i}`, status: "DONE", completedAt: period.gte } });
    const draft = await prisma.$transaction((db) => saveMonthlyDraft({ month, comment: "Commentaire de recette." }, db));
    assert.match(draft.draft, /7 actions clôturées/);
    const archive = await archiveMonthly(month, reportFingerprint(draft));
    assert.equal(reportContent(draft), archive.archive);
    await assert.rejects(prisma.$transaction((db) => saveMonthlyDraft({ month, comment: "Changement interdit" }, db)));
    const markdown = await app(`/api/reports/direction?month=${month}`, { headers: dsi });
    assert.equal(await markdown.text(), archive.archive);
    const exported = await (await app("/api/export/business", { headers: dsi })).text();
    assert.equal(JSON.parse(exported).version, 1);
    assert(!exported.includes("passwordHash") && !exported.includes(token));
    const tokenId = (await prisma.claudeToken.findFirstOrThrow({ where: { hash: hash(token) } })).id;
    assert.equal((await app(`/api/integrations/claude/${tokenId}`, { method: "DELETE", headers: dsi })).status, 204);
    assert.match((await call(client, "consulter_fiche", { entity: "action", id: action.id }, true)).error, /révoqué/);
    await app("/api/auth/logout", { method: "POST", headers: dsi });
    assert.equal((await app("/api/actions", { headers: dsi })).status, 401);
    console.log("Recette Docker HTTPS réussie · rôles, secours local, Kanban, CSV, Planner, rapports, MCP stdio et révocation.");
  } finally {
    await client?.close();
    await instance.close();
  }
}

async function verifyLocal(directory: string) {
  const instance = runInstance(false, directory);
  const { app, url } = instance;
  let client: Client | undefined;
  try {
    await waitForApp(app);
    const session = (await login(instance, password)).headers.get("set-cookie")?.split(";")[0];
    assert(session, "Local fallback login failed over HTTP");
    const dsi = { Cookie: session, Origin: url, "Content-Type": "application/json" };
    const setup = await app("/settings/integrations/claude", { headers: dsi });
    assert.equal(setup.status, 200);
    assert((await setup.text()).includes(url));
    const token = await createToken(app, dsi);
    const extension = await launchExtension(app, dsi, directory, url, token);
    client = extension.client;
    const info = await client.listTools();
    assert(info.tools.find((tool) => tool.name === "lire_roadmap")?.annotations?.readOnlyHint);

    const { data: created } = await call(client, "creer_projet", { key: "local-project-1", fields: { title: "Projet Claude local", type: "SUPPORT", status: "ACTIVE", targetDate: "2027-01-15T09:00:00Z" } });
    const projectId = created.saved[0].id;
    assert.equal(created.saved[0].url, `${url}/projects/${projectId}`);
    await call(client, "creer_jalon", { key: "local-milestone-1", fields: { title: "Pilote local", projectId, dueDate: "2027-01-10T09:00:00Z" } });
    const { data: batch } = await call(client, "enregistrer_compte_rendu", {
      key: "local-meeting-1", meeting: { title: "Réunion locale", rawContent: "Valider le pilote et prévenir l’équipe.", projectId, meetingDate: new Date().toISOString() },
      actions: [{ title: "Valider le pilote local", dueDate: "2027-01-09T09:00:00Z" }, { title: "Prévenir l’équipe" }]
    });
    await call(client, "modifier_action", { key: "local-action-1", id: batch.saved[1].id, fields: { status: "DONE" } });
    const { data: portfolio } = await call(client, "lire_roadmap", { status: "ACTIVE", limit: 100 });
    assert(portfolio.projects.some((project: { id: string }) => project.id === projectId));
    const { data: plan } = await call(client, "lire_roadmap", { projectId, limit: 1 });
    assert.equal(plan.project.targetDate, "2027-01-15T09:00:00.000Z");
    assert.equal(plan.project.actionCount, 2);
    assert.equal(plan.project.milestones[0].title, "Pilote local");
    assert.equal(plan.actions[0].status, "DONE");
    assert.equal(plan.nextOffset, 1);
    const { data: next } = await call(client, "lire_roadmap", { projectId, limit: 1, offset: plan.nextOffset });
    assert.equal(next.actions[0].title, "Prévenir l’équipe");
    assert.equal(next.nextOffset, null);

    for (const origin of ["http://127.0.0.1:3080", "http://[::1]:3080", "https://pilotage.intra.example"]) assert(claudeOrigin(origin));
    for (const origin of ["http://127.example.test", "http://192.168.0.10", "http://localhost/fiche", "http://localhost/?", "http://localhost/#", "http://agent:secret@localhost", "file:///tmp/cio"]) assert.equal(claudeOrigin(origin), null);
    const rejected = spawnSync(extension.node, extension.args, {
      env: { ...process.env, ...extension.env, CIO_URL: "http://pilotage.intra.example" }, encoding: "utf8", timeout: 5000
    });
    assert.equal(rejected.status, 1);
    assert.match(rejected.stderr, /localhost:3000/);
    console.log("Recette Docker locale réussie · extension téléchargée, lecture roadmap et écritures MCP sur localhost en HTTP.");
  } finally {
    await client?.close();
    await instance.close();
  }
}

async function main() {
  assert(process.env.DATABASE_URL?.startsWith("file:/tmp/"), "Use a disposable database.");
  execFileSync(command, ["scripts/account.ts", "local"], { input: password });
  const directory = mkdtempSync(join(tmpdir(), "CIO Desktop "));
  try {
    await verifyShared(directory);
    await verifyLocal(directory);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
