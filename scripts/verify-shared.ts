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
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
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
  const env = { ...process.env, CIO_PUBLIC_URL: url, CIO_MCP_HTTP_ENABLED: "true", ENTRA_TENANT_ID: "", ENTRA_CLIENT_ID: "", ENTRA_CLIENT_SECRET: "" };
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

async function createToken(app: Instance["app"], headers: HeadersInit, scope: "PILOTAGE" | "LECTURE" = "PILOTAGE") {
  const response = await app("/api/integrations/claude", { method: "POST", headers, body: JSON.stringify({ label: "Recette MCP", scope }) });
  assert.equal(response.status, 201);
  const { token, expiresAt } = await response.json();
  assert(Date.parse(expiresAt) > Date.now());
  return token as string;
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
    const askAboutProjects = (text: string, headers?: HeadersInit) => {
      const body = new FormData();
      body.set("text", text);
      return app("/api/assistant/messages", { method: "POST", headers, body });
    };
    const projectQuestion = "tu peux me dire quels sont les projets ?";
    const chatHeaders = { Cookie: session, Origin: url };
    assert.equal((await askAboutProjects(projectQuestion)).status, 401);
    assert.equal((await askAboutProjects(projectQuestion, { ...chatHeaders, Cookie: restricted.Cookie })).status, 403);
    const projectsReply = await askAboutProjects(projectQuestion, chatHeaders);
    assert.equal(projectsReply.status, 200);
    const { data: projectList } = await projectsReply.json();
    assert.equal(projectList.assistantMessage.status, "answered");
    assert(projectList.links.some((link: { href: string }) => link.href === `/projects/${project.id}`));
    assert.deepEqual(projectList.operations, []);
    const projectReply = await askAboutProjects("Où en est le projet Recette projet ?", chatHeaders);
    assert.equal(projectReply.status, 200);
    const { data: projectDetails } = await projectReply.json();
    assert.match(projectDetails.assistantMessage.content, /Recette projet.*En cours/);
    assert.equal(projectDetails.links.length, 1);
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
    assert.equal(tools.tools.length, 39);
    const batch = {
      key: "meeting-recipe-1", meeting: { title: "Réunion de recette MCP", rawContent: "Compte rendu de recette.", projectId: project.id, meetingDate: new Date().toISOString() },
      actions: [{ title: "Action de recette liée", ownerId: apprentice.id, status: "BLOCKED", priority: "CRITICAL" }],
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
    const { data: actionBefore } = await call(client, "consulter_fiche", { entity: "action", id: action.id });
    const updateArgs = { key: "action-recipe-1", id: action.id, expectedVersion: actionBefore.version, fields: { title: "Action modifiée par MCP" } };
    const actionUpdate = await call(client, "modifier_action", updateArgs);
    assert.deepEqual(await call(client, "modifier_action", updateArgs), actionUpdate);
    assert.equal(actionUpdate.data.saved[0].data.status, "BLOCKED");
    assert.equal(actionUpdate.data.saved[0].data.priority, "CRITICAL");
    assert((await (await app("/", { headers: dsi })).text()).includes("Action modifiée par MCP"));
    const { data: cockpit } = await call(client, "lire_cockpit", { urgency: "urgent", limit: 50 });
    const urgent = cockpit.items.find((item: { id: string }) => item.id === action.id);
    assert.equal(urgent?.title, "Action modifiée par MCP");
    assert.equal(urgent?.url, `${url}/actions?selectedId=${action.id}`);
    assert(cockpit.items.every((item: { urgency: string }) => item.urgency === "urgent"));
    assert.equal(cockpit.counts.urgent, cockpit.matchingItems);
    const weekly = await app("/api/reports/markdown?type=weekly", { headers: dsi });
    assert.equal(weekly.status, 200);
    assert((await weekly.text()).includes(`[${urgent.title}](${urgent.url})`));
    assert.equal((await app("/api/reports/markdown?type=weekly", { headers: restricted })).status, 403);
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
    const actionId = batch.saved[1].id;
    const { data: before } = await call(client, "consulter_fiche", { entity: "action", id: actionId });
    const mcpUrl = new URL("/api/mcp", url);
    assert.equal((await app("/api/mcp")).status, 401);
    assert.equal((await app("/api/mcp", { headers: { Origin: "https://other.example", Authorization: `Bearer ${token}` } })).status, 403);
    const http = new Client({ name: "recette-mcp-http", version: "1.0.0" });
    try {
      await http.connect(new StreamableHTTPClientTransport(mcpUrl, { requestInit: { headers: { Authorization: `Bearer ${token}` } } }));
      assert((await http.listTools()).tools.some((tool) => tool.name === "modifier_action"));
      await call(http, "modifier_action", { key: "local-action-1", id: actionId, expectedVersion: before.version, fields: { status: "DONE" } });
      const conflict = await call(client, "modifier_action", {
        key: "local-action-conflict", id: actionId, expectedVersion: before.version, fields: { status: "TODO" }
      }, true);
      assert.match(conflict.error, /fiche a changé/);
      await verifyWorkspace(app, dsi, client, http, projectId, actionId);
    } finally {
      await http.close();
    }
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

    const readOnlyToken = await createToken(app, dsi, "LECTURE");
    const readOnly = (await launchExtension(app, dsi, directory, url, readOnlyToken)).client;
    const readOnlyHttp = new Client({ name: "recette-lecture-mcp-http", version: "1.0.0" });
    try {
      await readOnlyHttp.connect(new StreamableHTTPClientTransport(mcpUrl, { requestInit: { headers: { Authorization: `Bearer ${readOnlyToken}` } } }));
      assert((await readOnlyHttp.listTools()).tools.every((tool) => tool.annotations?.readOnlyHint));
      await call(readOnly, "lire_cockpit", { limit: 1 });
      const { data: current } = await call(readOnly, "consulter_fiche", { entity: "action", id: actionId });
      const denied = await call(readOnly, "modifier_action", { key: "local-denied-1", id: actionId, expectedVersion: current.version, fields: { status: "TODO" } }, true);
      assert.match(denied.error, /limité à la lecture/);
      assert.equal((await prisma.action.findUniqueOrThrow({ where: { id: batch.saved[1].id } })).status, "DONE");
      await prisma.claudeToken.update({ where: { hash: hash(readOnlyToken) }, data: { expiresAt: new Date(0) } });
      assert.match((await call(readOnly, "lire_cockpit", {}, true)).error, /expiré/);
    } finally {
      await readOnly.close();
      await readOnlyHttp.close();
    }

    for (const origin of ["http://127.0.0.1:3080", "http://[::1]:3080", "https://pilotage.intra.example"]) assert(claudeOrigin(origin));
    for (const origin of ["http://127.example.test", "http://192.168.0.10", "http://localhost/fiche", "http://localhost/?", "http://localhost/#", "http://agent:secret@localhost", "file:///tmp/cio"]) assert.equal(claudeOrigin(origin), null);
    const rejected = spawnSync(extension.node, extension.args, {
      env: { ...process.env, ...extension.env, CIO_URL: "http://pilotage.intra.example" }, encoding: "utf8", timeout: 5000
    });
    assert.equal(rejected.status, 1);
    assert.match(rejected.stderr, /localhost:3000/);
    console.log("Recette unifiée réussie · pages, blocs, vues liées, sous-pages, historique, conflits inter-clients et droits MCP HTTP/stdio.");
  } finally {
    await client?.close();
    await instance.close();
  }
}

async function verifyWorkspace(app: Instance["app"], headers: HeadersInit, local: Client, http: Client, projectId: string, actionId: string) {
  const stableViewId = "8f82a992-1052-4a56-8b17-c55dd801098a";
  const view = { id: stableViewId, title: "Actions du projet", entity: "action", projectId, layout: "kanban", status: "", query: "" };
  const body = { key: "workspace-create-1", fields: { title: "Pilotage unifié", contentMarkdown: "# Suivi partagé\n\nÀ relire ensemble.", views: [view] } };
  const created = await app("/api/workspace/pages", { method: "POST", headers, body: JSON.stringify(body) });
  assert.equal(created.status, 201, await created.clone().text());
  const { data: page } = await created.json();
  assert.deepEqual((await (await app("/api/workspace/pages", { method: "POST", headers, body: JSON.stringify(body) })).json()).data, page);
  assert.equal(await prisma.workspacePage.count(), 1);
  const { data: read } = await call(local, "consulter_fiche", { entity: "page", id: page.id });
  assert.equal(read.version, page.version);
  assert(Array.isArray(read.data.contentBlocks));
  assert(read.data.contentBlocks.length > 0);
  const { data: live } = await call(http, "lire_vue", { pageId: page.id, viewId: stableViewId });
  assert.equal(live.total, 2);
  const before = await app("/api/workspace/pages/" + page.id + "/views/" + stableViewId, { headers });
  assert.deepEqual((await before.json()).data, live);
  const changedAction = await app("/api/actions/" + actionId, {
    method: "PATCH", headers, body: JSON.stringify({ title: "Action actualisée dans une page" })
  });
  assert(changedAction.ok);
  const { data: actual } = await call(local, "lire_vue", { pageId: page.id, viewId: stableViewId });
  assert(actual.items.some((item: { title: string }) => item.title === "Action actualisée dans une page"));
  assert.equal(await prisma.action.count({ where: { projectId } }), 2);
  const { data: child } = await call(http, "creer_page", { key: "workspace-child-1", fields: { title: "Compte rendu", parentId: page.id, contentMarkdown: "Sous-page liée au projet." } });
  const childId = child.saved[0].id;
  assert.equal((await call(local, "rechercher_pages", { parentId: page.id })).data.items[0].id, childId);
  const updated = await call(http, "modifier_page", { key: "workspace-edit-1", id: page.id, expectedVersion: read.version, fields: { contentMarkdown: "# Suivi actualisé\n\nÉcriture depuis un autre assistant." } });
  assert.equal(updated.data.saved[0].data.revision, 2);
  const stale = await app("/api/workspace/pages/" + page.id, { method: "PATCH", headers, body: JSON.stringify({ key: "workspace-stale-1", expectedVersion: read.version, fields: body.fields }) });
  assert.equal(stale.status, 409);
  const fresh = await call(local, "consulter_fiche", { entity: "page", id: page.id });
  const loop = await call(local, "modifier_page", { key: "workspace-loop-1", id: page.id, expectedVersion: fresh.data.version, fields: { parentId: childId } }, true);
  assert.match(loop.error, /boucle/);
  const exportResponse = await app("/api/workspace/pages/" + page.id + "/export?revision=1", { headers });
  assert.equal(exportResponse.status, 200);
  assert.match(await exportResponse.text(), /Suivi partagé/);
  assert.equal(await prisma.workspaceRevision.count({ where: { pageId: page.id } }), 2);
  const listed = await app("/workspace", { headers });
  assert.equal(listed.status, 200);
  assert((await listed.text()).includes("Pilotage unifié"));
  const detail = await app("/workspace/" + page.id, { headers });
  assert.equal(detail.status, 200);
  assert((await detail.text()).includes("Compte rendu"));
  assert.equal((await app("/api/workspace/pages/" + page.id)).status, 401);
  const apprentice = await prisma.user.findFirstOrThrow({ where: { role: "APPRENTI" } });
  const restrictedToken = randomBytes(32).toString("base64url");
  await prisma.session.create({ data: { hash: hash(restrictedToken), userId: apprentice.id, expiresAt: new Date(Date.now() + 60000) } });
  assert.equal((await app("/api/workspace/pages/" + page.id, { headers: { Cookie: "cio_session=" + restrictedToken } })).status, 403);
}

async function main() {
  assert(process.env.DATABASE_URL?.startsWith("file:/tmp/") ||
    (process.env.CIO_VERIFY_POSTGRES === "true" && new URL(process.env.DATABASE_URL || "").pathname === "/cio_recipe"), "Use a disposable database.");
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
