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
          <h3 className="form-section-title">Cadre</h3>
          <p className="form-section-caption">Pose le titre, la date et le projet rattache avant de structurer le compte-rendu.</p>
        </div>
        <div>
          <label className="field-label">Titre</label>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Ex: Codir du lundi"
            required
            className="field-input"
          />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
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
          <h3 className="form-section-title">Contenu</h3>
          <p className="form-section-caption">Conserve le brut puis ajoute une synthese exploitable pour le suivi.</p>
        </div>
        <div>
          <label className="field-label">Compte-rendu brut</label>
          <textarea
            value={rawContent}
            onChange={(event) => setRawContent(event.target.value)}
            rows={8}
            required
            className="field-textarea"
          />
        </div>
        <div>
          <label className="field-label">Synthese</label>
          <textarea
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
            rows={4}
            className="field-textarea"
          />
        </div>
      </section>
      <section className="form-section space-y-3">
        <div>
          <h3 className="form-section-title">Extraction</h3>
          <p className="form-section-caption">Structure les suites a donner pour rendre la reunion directement actionnable.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="field-label">Actions</label>
            <textarea
              value={extractedActions}
              onChange={(event) => setExtractedActions(event.target.value)}
              rows={5}
              className="field-textarea"
            />
          </div>
          <div>
            <label className="field-label">Decisions</label>
            <textarea
              value={extractedDecisions}
              onChange={(event) => setExtractedDecisions(event.target.value)}
              rows={5}
              className="field-textarea"
            />
          </div>
          <div>
            <label className="field-label">Risques</label>
            <textarea
              value={extractedRisks}
              onChange={(event) => setExtractedRisks(event.target.value)}
              rows={5}
              className="field-textarea"
            />
          </div>
          <div>
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
        <p className="form-actions-note">Le module reunion sert de receptacle pour les futures sorties IA et transcription.</p>
        <button disabled={loading} className="button-primary">
          {loading ? (mode === "create" ? "Creation..." : "Enregistrement...") : mode === "create" ? "Creer la reunion" : "Enregistrer"}
        </button>
      </div>
    </form>
  );
}
