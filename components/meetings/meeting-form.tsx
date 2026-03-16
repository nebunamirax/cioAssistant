"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type MeetingFormValues = {
  projectId?: string | null;
  title: string;
  meetingDate: string;
  attendees: string[];
  rawContent: string;
  summary?: string | null;
  extractedActions: string[];
  extractedDecisions: string[];
  extractedRisks: string[];
  extractedDeadlines: string[];
};

type ProjectOption = {
  id: string;
  title: string;
};

type MeetingFormProps = {
  mode?: "create" | "edit";
  meetingNoteId?: string;
  initialValues?: Partial<MeetingFormValues>;
  projectOptions: ProjectOption[];
  showHeader?: boolean;
};

function listToTextarea(value?: string[]) {
  return value?.join("\n") ?? "";
}

function textareaToList(value: string) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function MeetingForm({
  mode = "create",
  meetingNoteId,
  initialValues,
  projectOptions,
  showHeader = true
}: MeetingFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [projectId, setProjectId] = useState(initialValues?.projectId ?? "");
  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [meetingDate, setMeetingDate] = useState(initialValues?.meetingDate ?? "");
  const [attendees, setAttendees] = useState(listToTextarea(initialValues?.attendees));
  const [rawContent, setRawContent] = useState(initialValues?.rawContent ?? "");
  const [summary, setSummary] = useState(initialValues?.summary ?? "");
  const [extractedActions, setExtractedActions] = useState(listToTextarea(initialValues?.extractedActions));
  const [extractedDecisions, setExtractedDecisions] = useState(listToTextarea(initialValues?.extractedDecisions));
  const [extractedRisks, setExtractedRisks] = useState(listToTextarea(initialValues?.extractedRisks));
  const [extractedDeadlines, setExtractedDeadlines] = useState(listToTextarea(initialValues?.extractedDeadlines));

  useEffect(() => {
    setProjectId(initialValues?.projectId ?? "");
    setTitle(initialValues?.title ?? "");
    setMeetingDate(initialValues?.meetingDate ?? "");
    setAttendees(listToTextarea(initialValues?.attendees));
    setRawContent(initialValues?.rawContent ?? "");
    setSummary(initialValues?.summary ?? "");
    setExtractedActions(listToTextarea(initialValues?.extractedActions));
    setExtractedDecisions(listToTextarea(initialValues?.extractedDecisions));
    setExtractedRisks(listToTextarea(initialValues?.extractedRisks));
    setExtractedDeadlines(listToTextarea(initialValues?.extractedDeadlines));
  }, [initialValues, meetingNoteId, mode]);

  const resetForm = () => {
    setProjectId("");
    setTitle("");
    setMeetingDate("");
    setAttendees("");
    setRawContent("");
    setSummary("");
    setExtractedActions("");
    setExtractedDecisions("");
    setExtractedRisks("");
    setExtractedDeadlines("");
  };

  const generateDraft = async () => {
    if (!rawContent.trim()) {
      setError("Ajoute d'abord le compte-rendu brut pour lancer la synthese.");
      return;
    }

    setGenerating(true);
    setError(null);

    const response = await fetch("/api/meeting-notes/draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rawContent,
        meetingDate: meetingDate ? new Date(meetingDate).toISOString() : null
      })
    });
    const payload = await response.json();

    if (!response.ok) {
      setError(payload.error ?? "Impossible de generer la synthese.");
      setGenerating(false);
      return;
    }

    setSummary(payload.data.summary ?? "");
    setExtractedActions(listToTextarea(payload.data.extractedActions));
    setExtractedDecisions(listToTextarea(payload.data.extractedDecisions));
    setExtractedRisks(listToTextarea(payload.data.extractedRisks));
    setExtractedDeadlines(listToTextarea(payload.data.extractedDeadlines));

    if (!title.trim() && typeof payload.data.suggestedTitle === "string") {
      setTitle(payload.data.suggestedTitle);
    }

    if (!attendees.trim() && Array.isArray(payload.data.attendees)) {
      setAttendees(listToTextarea(payload.data.attendees));
    }

    setGenerating(false);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const response = await fetch(meetingNoteId ? `/api/meeting-notes/${meetingNoteId}` : "/api/meeting-notes", {
      method: meetingNoteId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: projectId || null,
        title,
        meetingDate: new Date(meetingDate).toISOString(),
        attendees: textareaToList(attendees),
        rawContent,
        summary,
        extractedActions: textareaToList(extractedActions),
        extractedDecisions: textareaToList(extractedDecisions),
        extractedRisks: textareaToList(extractedRisks),
        extractedDeadlines: textareaToList(extractedDeadlines)
      })
    });
    const payload = await response.json();

    if (!response.ok) {
      setError(payload.error ?? "Une erreur est survenue.");
      setLoading(false);
      return;
    }

    if (mode === "create") {
      resetForm();
    }

    setLoading(false);
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="form-stack">
      {showHeader && <h2 className="panel-title">{mode === "create" ? "Nouvelle reunion" : "Modifier la reunion"}</h2>}
      <section className="form-section space-y-3">
        <div>
          <h3 className="form-section-title">Point de depart</h3>
          <p className="form-section-caption">Commence par coller le brut. La baguette magique pre-remplit ensuite la synthese et les suites a donner avant sauvegarde.</p>
        </div>
        <div>
          <label className="field-label">Compte-rendu brut</label>
          <textarea
            value={rawContent}
            onChange={(event) => setRawContent(event.target.value)}
            rows={12}
            required
            placeholder="Colle ici tes notes de reunion, ton verbatim ou un compte-rendu brut. Ensuite lance la baguette magique pour generer la synthese."
            className="field-textarea min-h-[240px]"
          />
        </div>
        <div className="meeting-draft-toolbar">
          <div>
            <p className="meeting-draft-toolbar-title">Baguette magique</p>
            <p className="meeting-draft-toolbar-copy">Genere une synthese exploitable et extrait actions, decisions, risques et echeances sans enregistrer tout de suite.</p>
          </div>
          <button type="button" onClick={generateDraft} disabled={generating || !rawContent.trim()} className="button-secondary">
            {generating ? "Generation..." : "Generer la synthese"}
          </button>
        </div>
      </section>
      <section className="form-section space-y-3">
        <div>
          <h3 className="form-section-title">Cadre de la reunion</h3>
          <p className="form-section-caption">Ajuste les metadonnees avant d'enregistrer la note definitive.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="field-label">Titre</label>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Ex: Codir du lundi"
              required
              className="field-input"
            />
          </div>
          <div>
            <label className="field-label">Date et heure</label>
            <input
              type="datetime-local"
              value={meetingDate}
              onChange={(event) => setMeetingDate(event.target.value)}
              required
              className="field-input"
            />
          </div>
          <div>
            <label className="field-label">Projet</label>
            <select value={projectId} onChange={(event) => setProjectId(event.target.value)} className="field-select">
              <option value="">Aucun projet</option>
              {projectOptions.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.title}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="field-label">Participants</label>
          <textarea
            value={attendees}
            onChange={(event) => setAttendees(event.target.value)}
            placeholder={"Une ligne par participant\nDSI\nRSSI\nMOA"}
            rows={4}
            className="field-textarea"
          />
          <p className="field-hint">Une ligne par nom ou role.</p>
        </div>
      </section>
      <section className="form-section space-y-3">
        <div>
          <h3 className="form-section-title">Synthese generee / ajustee</h3>
          <p className="form-section-caption">Relis et retouche librement ce que la generation a propose avant sauvegarde.</p>
        </div>
        <div className="meeting-generated-shell">
          <label className="field-label">Synthese</label>
          <textarea
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
            rows={6}
            className="field-textarea"
          />
        </div>
      </section>
      <section className="form-section space-y-3">
        <div>
          <h3 className="form-section-title">Suites a donner</h3>
          <p className="form-section-caption">La generation peut pre-remplir ces blocs, mais tu gardes la main avant enregistrement.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="meeting-generated-shell">
            <label className="field-label">Actions</label>
            <textarea
              value={extractedActions}
              onChange={(event) => setExtractedActions(event.target.value)}
              rows={5}
              className="field-textarea"
            />
          </div>
          <div className="meeting-generated-shell">
            <label className="field-label">Decisions</label>
            <textarea
              value={extractedDecisions}
              onChange={(event) => setExtractedDecisions(event.target.value)}
              rows={5}
              className="field-textarea"
            />
          </div>
          <div className="meeting-generated-shell">
            <label className="field-label">Risques</label>
            <textarea
              value={extractedRisks}
              onChange={(event) => setExtractedRisks(event.target.value)}
              rows={5}
              className="field-textarea"
            />
          </div>
          <div className="meeting-generated-shell">
            <label className="field-label">Echeances</label>
            <textarea
              value={extractedDeadlines}
              onChange={(event) => setExtractedDeadlines(event.target.value)}
              rows={5}
              className="field-textarea"
            />
          </div>
        </div>
      </section>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="form-actions">
        <p className="form-actions-note">Le brut peut etre transforme avant sauvegarde, mais l'enregistrement reste toujours sous ton controle.</p>
        <button disabled={loading || generating} className="button-primary">
          {loading ? (mode === "create" ? "Creation..." : "Enregistrement...") : mode === "create" ? "Creer la reunion" : "Enregistrer"}
        </button>
      </div>
    </form>
  );
}
