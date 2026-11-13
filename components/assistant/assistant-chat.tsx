"use client";

import Link from "next/link";
import { useRef, useState } from "react";

type ProviderInfo = {
  provider: string;
  label: string;
  mode: string;
  model: string;
  location: "local" | "cloud";
};

type AssistantOperation = {
  id: string;
  module: string;
  title: string;
  status: "processing" | "created" | "review";
  href: string | null;
  description: string;
};

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  text: string;
  status?: "processing" | "created" | "review";
  statusLabel?: string;
  sourceName?: string | null;
  summary?: string;
  provider?: ProviderInfo;
  operations?: AssistantOperation[];
};

type AssistantApiResponse = {
  userMessage: {
    id: string;
    role: "user";
    text: string;
    sourceName: string | null;
  };
  assistantMessage: {
    id: string;
    role: "assistant";
    status: "created" | "review";
    statusLabel: string;
    summary: string;
    content: string;
    provider: ProviderInfo;
  };
  operations: Array<{
    id: string;
    module: string;
    title: string;
    status: "created" | "review";
    href: string | null;
    description: string;
  }>;
  created: Array<{
    id: string;
    module: string;
    title: string;
    href: string;
  }>;
  reviews: Array<{
    id: string;
    reason: string;
    selectedModule: string;
    href: string;
  }>;
};

function createMessageId() {
  if (typeof globalThis.crypto !== "undefined" && typeof globalThis.crypto.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function operationTone(status: AssistantOperation["status"]) {
  if (status === "created") {
    return "border-emerald-200 bg-emerald-50 text-emerald-900";
  }

  if (status === "review") {
    return "border-amber-200 bg-amber-50 text-amber-900";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

function statusLabel(status: AssistantOperation["status"] | NonNullable<ChatMessage["status"]>) {
  if (status === "created") {
    return "Créé";
  }

  if (status === "review") {
    return "À valider";
  }

  return "En cours";
}

function messageStatusLabel(message: ChatMessage) {
  if (message.statusLabel) {
    return message.statusLabel;
  }

  if (message.status === "processing") {
    return "Analyse en cours";
  }

  if (message.status === "created") {
    return "Terminé";
  }

  if (message.status === "review") {
    return "À valider";
  }

  return "";
}

function AssistantOperationResult({ operation }: { operation: AssistantOperation }) {
  return (
    <div className={`assistant-operation ${operationTone(operation.status)}`}>
      <div className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] opacity-70">
          {statusLabel(operation.status)} · {operation.module}
        </p>
        <p className="text-sm font-semibold">{operation.title}</p>
        <p className="text-sm opacity-80">{operation.description}</p>
      </div>
      {operation.href ? (
        <Link href={operation.href} className="button-secondary">
          Ouvrir
        </Link>
      ) : null}
    </div>
  );
}

function AssistantMessageList({ messages }: { messages: ChatMessage[] }) {
  return (
    <div className="assistant-thread">
      {messages.map((message) => (
        <article
          key={message.id}
          className={message.role === "assistant" ? "assistant-bubble assistant-bubble-assistant" : "assistant-bubble assistant-bubble-user"}
        >
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                {message.role === "assistant" ? "Assistant" : "Vous"}
              </p>
              {message.status ? (
                <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.12em] text-slate-600">
                  {messageStatusLabel(message)}
                </span>
              ) : null}
            </div>
            {message.summary ? <p className="text-sm font-medium text-slate-950">{message.summary}</p> : null}
            <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{message.text}</p>
            {message.sourceName ? (
              <p className="text-xs font-medium text-slate-500">Document joint: {message.sourceName}</p>
            ) : null}
            {message.provider ? (
              <p className="text-xs uppercase tracking-[0.12em] text-slate-500">
                {message.provider.label} · {message.provider.model} · {message.provider.location}
              </p>
            ) : null}
          </div>
          {message.operations?.length ? (
            <div className="mt-4 space-y-3">
              {message.operations.map((operation) => (
                <AssistantOperationResult key={operation.id} operation={operation} />
              ))}
            </div>
          ) : null}
        </article>
      ))}
    </div>
  );
}

function AssistantComposer({
  busy,
  onSubmit
}: {
  busy: boolean;
  onSubmit: (data: { text: string; file: File | null }) => Promise<boolean>;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);

  return (
    <form
      className="assistant-composer assistant-composer-primary"
      onSubmit={async (event) => {
        event.preventDefault();
        const file = fileInputRef.current?.files?.[0] ?? null;
        const submitted = await onSubmit({ text, file });

        if (submitted) {
          setText("");
          setFileName(null);
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
        }
      }}
    >
      <div className="space-y-2">
        <label className="field-label" htmlFor="assistant-message">Message</label>
        <textarea
          id="assistant-message"
          value={text}
          onChange={(event) => setText(event.target.value)}
          className="field-textarea min-h-[132px]"
          placeholder="Ex. Crée le projet Migration SSO et ajoute une action pour préparer le pilote."
        />
      </div>
      <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <label className="field-label" htmlFor="assistant-document">Pièce jointe</label>
          <input
            id="assistant-document"
            ref={fileInputRef}
            type="file"
            accept=".txt,.md,.markdown,.csv,.json,.eml,.pdf,.docx,text/plain,text/markdown,message/rfc822,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="field-input file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium"
            onChange={(event) => setFileName(event.target.files?.[0]?.name ?? null)}
          />
          <p className="field-hint">
            {fileName ? `Prêt à envoyer · ${fileName}` : "Formats acceptés · txt, md, csv, json, eml, pdf, docx."}
          </p>
        </div>
        <button disabled={busy || (!text.trim() && !fileName)} className="button-primary min-w-[140px]">
          {busy ? "Analyse en cours..." : "Envoyer"}
        </button>
      </div>
    </form>
  );
}

export function AssistantChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);



  const submit = async ({ file, text }: { text: string; file: File | null }) => {
    const trimmedText = text.trim();
    if (!file && trimmedText.length < 10) {
      setError("Ajoute un texte plus descriptif ou un document.");
      return false;
    }

    setBusy(true);
    setError(null);

    const userMessage: ChatMessage = {
      id: createMessageId(),
      role: "user",
      text: trimmedText || "Document transmis",
      sourceName: file?.name ?? null
    };
    const processingMessageId = createMessageId();

    setMessages((current) => [
      ...current,
      userMessage,
      {
        id: processingMessageId,
        role: "assistant",
        text: "Je traite la demande et je prepare les operations detectees.",
        status: "processing",
        statusLabel: "Analyse en cours"
      }
    ]);

    const body = new FormData();
    body.set("text", trimmedText);
    if (file) {
      body.set("file", file);
      body.set("sourceName", file.name);
    }

    try {
      const response = await fetch("/api/assistant/messages", {
        method: "POST",
        body
      });
      const payload = await response.json();

      if (!response.ok) {
        setMessages((current) => current.filter((message) => message.id !== processingMessageId));
        setError(payload.error ?? "Impossible d’envoyer le message. Réessayez.");
        setBusy(false);
        return false;
      }

      const data = payload.data as AssistantApiResponse;
      const assistantMessage: ChatMessage = {
        id: data.assistantMessage.id,
        role: "assistant",
        text: data.assistantMessage.content,
        status: data.assistantMessage.status,
        statusLabel: data.assistantMessage.statusLabel,
        summary: data.assistantMessage.summary,
        provider: data.assistantMessage.provider,
        operations: data.operations
      };

      setMessages((current) => current.map((message) => (message.id === processingMessageId ? assistantMessage : message)));
      setBusy(false);
      return true;
    } catch {
      setMessages((current) => current.filter((message) => message.id !== processingMessageId));
      setError("Impossible d’envoyer le message. Réessayez.");
      setBusy(false);
      return false;
    }
  };

  return (
    <div className="space-y-4">
      <section>
        <AssistantComposer busy={busy} onSubmit={submit} />
        {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
      </section>
      {messages.length > 0 && (
        <section className="workbench-panel space-y-3">
          <h2 className="panel-title">Conversation</h2>
          <AssistantMessageList messages={messages} />
        </section>
      )}
    </div>
  );
}
