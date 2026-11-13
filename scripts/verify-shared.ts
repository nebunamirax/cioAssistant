import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { execFileSync, spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { createServer } from "node:https";
import { request as forward } from "node:http";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { prisma } from "../lib/db/prisma";
import { allowedMonths, archiveMonthly, monthBounds, reportContent, reportFingerprint, saveMonthlyDraft } from "../lib/services/monthly-report-service";
import { saveExternalItems } from "../lib/services/external-tracking-service";

const url = "https://localhost:3443";
const plain = "http://127.0.0.1:3000";
const password = "temporary-recipe-" + randomBytes(12).toString("hex");
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const env = { ...process.env, CIO_PUBLIC_URL: url, ENTRA_TENANT_ID: "", ENTRA_CLIENT_ID: "", ENTRA_CLIENT_SECRET: "", NODE_EXTRA_CA_CERTS: "/tmp/cio-recipe-cert.pem" };
const command = "./node_modules/.bin/tsx";

async function main() {
  assert(process.env.DATABASE_URL?.startsWith("file:/tmp/"), "Use a disposable database.");
  execFileSync(command, ["scripts/account.ts", "local"], { input: password, env });
  execFileSync("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-days", "1", "-subj", "/CN=localhost",
    "-addext", "subjectAltName=DNS:localhost", "-keyout", "/tmp/cio-recipe-key.pem", "-out", "/tmp/cio-recipe-cert.pem"], { stdio: "ignore" });
  execFileSync("python3", ["-c", "import zipfile; zipfile.ZipFile('dist/cio-assistant.mcpb').extractall('/tmp/cio-recipe-mcp')"]);
  const server = spawn("node", ["node_modules/next/dist/bin/next", "start"], { env, stdio: "inherit" });
  const tls = createServer({ key: readFileSync("/tmp/cio-recipe-key.pem"), cert: readFileSync("/tmp/cio-recipe-cert.pem") }, (req, res) => {
    const proxy = forward(plain + req.url, { method: req.method, headers: { ...req.headers, "x-forwarded-proto": "https" } }, (upstream) => {
      res.writeHead(upstream.statusCode ?? 502, upstream.headers);
      upstream.pipe(res);
    });
    proxy.on("error", () => { res.writeHead(502); res.end(); });
    req.pipe(proxy);
  });
  tls.listen(3443);
  const client = new Client({ name: "cio-docker-recipe", version: "1.0.0" });
  try {
    const app = (path: string, init: RequestInit = {}) => fetch(plain + path, { ...init, redirect: "manual" });
    let ready = false;
    for (let index = 0; index < 50; index++) {
      ready = await app("/login").then((res) => res.ok).catch(() => false);
      if (ready) break;
      await new Promise((done) => setTimeout(done, 250));
    }
    assert(ready, "Next.js did not start");
    assert.equal((await app("/api/actions")).status, 401);
    assert.equal((await app("/api/auth/entra/start")).status, 307);

    const login = (candidate: string) => app("/api/auth/local", { method: "POST", headers: { Origin: url }, body: new URLSearchParams({ password: candidate }) });
    for (let index = 0; index < 8; index++) assert.equal((await login("wrong")).headers.get("set-cookie"), null);
    assert.equal((await login(password)).headers.get("set-cookie"), null);
    await prisma.loginAttempt.deleteMany();
    const logged = await login(password);
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

    const tokenResponse = await app("/api/integrations/claude", { method: "POST", headers: dsi, body: JSON.stringify({ label: "Recette MCP" }) });
    assert.equal(tokenResponse.status, 201);
    const { token } = await tokenResponse.json();
    assert.equal((await app("/api/integrations/claude/extension", { headers: dsi })).status, 200);
    await client.connect(new StdioClientTransport({
      command: "node", args: ["/tmp/cio-recipe-mcp/server.cjs"], env: { CIO_URL: url, CIO_TOKEN: token, NODE_EXTRA_CA_CERTS: env.NODE_EXTRA_CA_CERTS }
    }));
    const tools = await client.listTools();
    assert.equal(tools.tools.length, 33);
    const call = async (name: string, args: Record<string, unknown>, error = false) => {
      const result = await client.callTool({ name, arguments: args });
      assert.equal(Boolean(result.isError), error, JSON.stringify(result));
      const content = result.content as Array<{ text: string }>;
      return JSON.parse(content[0].text);
    };
    const batch = {
      key: "meeting-recipe-1", meeting: { title: "Réunion de recette MCP", rawContent: "Compte rendu de recette.", projectId: project.id, meetingDate: new Date().toISOString() },
      actions: [{ title: "Action de recette liée", ownerId: apprentice.id, status: "BLOCKED" }],
      risks: [{ title: "Risque de recette lié" }], decisions: [{ subject: "Décision de recette liée" }]
    };
    const first = await call("enregistrer_compte_rendu", batch);
    assert.equal(first.data.saved.length, 4);
    assert.deepEqual(await call("enregistrer_compte_rendu", batch), first);
    const [meeting, action, risk, decision] = first.data.saved;
    assert.equal(await prisma.meetingNote.count({ where: { title: batch.meeting.title } }), 1);
    for (const row of [action, risk, decision]) {
      assert.equal(row.data.meetingNoteId, meeting.id);
      assert(row.url.startsWith(url));
    }
    await call("modifier_action", { key: "action-recipe-1", id: action.id, fields: { title: "Action modifiée par MCP" } });
    assert((await (await app("/", { headers: dsi })).text()).includes("Action modifiée par MCP"));
    await prisma.project.create({ data: { title: "Recette projet homonyme", type: "SUPPORT" } });
    const ambiguous = await call("enregistrer_compte_rendu", { ...batch, key: "ambiguous-recipe", meeting: { ...batch.meeting, projectId: null, projectName: "Recette projet" } }, true);
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
    assert.match((await call("consulter_fiche", { entity: "action", id: action.id }, true)).error, /révoqué/);
    await app("/api/auth/logout", { method: "POST", headers: dsi });
    assert.equal((await app("/api/actions", { headers: dsi })).status, 401);
    console.log("Recette Docker réussie · rôles, secours local, Kanban, CSV, Planner, rapports, MCP stdio et révocation.");
  } finally {
    await client.close();
    tls.close();
    server.kill("SIGTERM");
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
