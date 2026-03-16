"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type MeetingActionDraft = {
  title: string;
  ownerName?: string | null;
  dueDate?: string | null;
  notes?: string | null;
  createdActionId?: string | null;
};

type MeetingFormValues = {
  projectId?: string | null;
  title: string;
  meetingDate: string;
  attendees: string[];
  rawContent: string;
  summary?: string | null;
  extractedActions: MeetingActionDraft[];
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

function normalizeActionDraft(draft?: Partial<MeetingActionDraft>): MeetingActionDraft {
  return {
    title: draft?.title ?? "",
    ownerName: draft?.ownerName ?? "",
    dueDate: draft?.dueDate ?? "",
    notes: draft?.notes ?? "",
    createdActionId: draft?.createdActionId ?? null
  };
}

function encodeWav(audioBuffer: AudioBuffer) {
  const channelCount = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const frameCount = audioBuffer.length;
  const bytesPerSample = 2;
  const blockAlign = channelCount * bytesPerSample;
  const buffer = new ArrayBuffer(44 + frameCount * blockAlign);
  const view = new DataView(buffer);

  const writeString = (offset: number, value: string) => {
    for (let index = 0; index < value.length; index += 1) {
      view.setUint8(offset + index, value.charCodeAt(index));
    }
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + frameCount * blockAlign, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channelCount, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, frameCount * blockAlign, true);

  let offset = 44;
  for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
    for (let channelIndex = 0; channelIndex < channelCount; channelIndex += 1) {
      const sample = audioBuffer.getChannelData(channelIndex)[frameIndex] ?? 0;
      const clamped = Math.max(-1, Math.min(1, sample));
      view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
      offset += bytesPerSample;
    }
  }

  return new Blob([buffer], { type: "audio/wav" });
}

export function MeetingForm({
  mode = "create",
  meetingNoteId,
  initialValues,
  projectOptions,
  showHeader = true
}: MeetingFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const [currentMeetingNoteId, setCurrentMeetingNoteId] = useState(meetingNoteId ?? null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [projectId, setProjectId] = useState(initialValues?.projectId ?? "");
  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [meetingDate, setMeetingDate] = useState(initialValues?.meetingDate ?? "");
  const [attendees, setAttendees] = useState(listToTextarea(initialValues?.attendees));
  const [rawContent, setRawContent] = useState(initialValues?.rawContent ?? "");
  const [summary, setSummary] = useState(initialValues?.summary ?? "");
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  const [audioLabel, setAudioLabel] = useState<string | null>(null);
  const [pendingAudioFile, setPendingAudioFile] = useState<File | null>(null);
  const [hasFreshTranscript, setHasFreshTranscript] = useState(false);
  const [creatingActions, setCreatingActions] = useState(false);
  const [extractedActions, setExtractedActions] = useState<MeetingActionDraft[]>(
    Array.isArray(initialValues?.extractedActions) ? initialValues.extractedActions.map((draft) => normalizeActionDraft(draft)) : []
  );
  const [extractedDecisions, setExtractedDecisions] = useState(listToTextarea(initialValues?.extractedDecisions));
  const [extractedRisks, setExtractedRisks] = useState(listToTextarea(initialValues?.extractedRisks));
  const [extractedDeadlines, setExtractedDeadlines] = useState(listToTextarea(initialValues?.extractedDeadlines));

  useEffect(() => {
    setCurrentMeetingNoteId(meetingNoteId ?? null);
    setProjectId(initialValues?.projectId ?? "");
    setTitle(initialValues?.title ?? "");
    setMeetingDate(initialValues?.meetingDate ?? "");
    setAttendees(listToTextarea(initialValues?.attendees));
    setRawContent(initialValues?.rawContent ?? "");
    setSummary(initialValues?.summary ?? "");
    setPendingAudioFile(null);
    setHasFreshTranscript(false);
    setExtractedActions(
      Array.isArray(initialValues?.extractedActions) ? initialValues.extractedActions.map((draft) => normalizeActionDraft(draft)) : []
    );
    setExtractedDecisions(listToTextarea(initialValues?.extractedDecisions));
    setExtractedRisks(listToTextarea(initialValues?.extractedRisks));
    setExtractedDeadlines(listToTextarea(initialValues?.extractedDeadlines));
  }, [initialValues, meetingNoteId, mode]);

  useEffect(() => {
    return () => {
      if (audioPreviewUrl) {
        URL.revokeObjectURL(audioPreviewUrl);
      }

      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [audioPreviewUrl]);

  const buildMeetingPayload = () => ({
    projectId: projectId || null,
    title,
    meetingDate: new Date(meetingDate).toISOString(),
    attendees: textareaToList(attendees),
    rawContent,
    summary,
    extractedActions: extractedActions.map((action) => ({
      title: action.title,
      ownerName: action.ownerName || null,
      dueDate: action.dueDate || null,
      notes: action.notes || null,
      createdActionId: action.createdActionId || null
    })),
    extractedDecisions: textareaToList(extractedDecisions),
    extractedRisks: textareaToList(extractedRisks),
    extractedDeadlines: textareaToList(extractedDeadlines)
  });

  const resetForm = () => {
    setProjectId("");
    setTitle("");
    setMeetingDate("");
    setAttendees("");
    setRawContent("");
    setSummary("");
    setAudioLabel(null);
    setPendingAudioFile(null);
    setHasFreshTranscript(false);
    if (audioPreviewUrl) {
      URL.revokeObjectURL(audioPreviewUrl);
    }
    setAudioPreviewUrl(null);
    setExtractedActions([]);
    setExtractedDecisions("");
    setExtractedRisks("");
    setExtractedDeadlines("");
  };

  const updateAudioPreview = (blob: Blob, label: string) => {
    if (audioPreviewUrl) {
      URL.revokeObjectURL(audioPreviewUrl);
    }

    setAudioPreviewUrl(URL.createObjectURL(blob));
    setAudioLabel(label);
  };

  const mergeTranscriptIntoRawContent = (transcript: string) => {
    setRawContent((current) => {
      const normalizedTranscript = transcript.trim();
      if (!normalizedTranscript) {
        return current;
      }

      return current.trim() ? `${current.trim()}\n\n${normalizedTranscript}` : normalizedTranscript;
    });
  };

  const transcribeAudioFile = async (file: File) => {
    setTranscribing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/meeting-notes/transcribe", {
        method: "POST",
        body: formData
      });
      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error ?? "Impossible de transcrire l'audio.");
        return null;
      }

      const transcript = typeof payload.data?.text === "string" ? payload.data.text.trim() : "";
      mergeTranscriptIntoRawContent(transcript);
      setAudioLabel(file.name);
      setPendingAudioFile(null);
      setHasFreshTranscript(Boolean(transcript));
      return transcript;
    } finally {
      setTranscribing(false);
    }
  };

  const generateDraftFromAudio = async () => {
    let draftSource = rawContent;

    if (pendingAudioFile) {
      const transcript = await transcribeAudioFile(pendingAudioFile);
      if (!transcript) {
        return;
      }
      draftSource = draftSource.trim() ? `${draftSource.trim()}\n\n${transcript}` : transcript;
    }

    await generateDraft(draftSource);
    setHasFreshTranscript(false);
  };

  const handleAudioFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    updateAudioPreview(file, file.name);
    setPendingAudioFile(file);
    setHasFreshTranscript(false);
    event.target.value = "";
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
  };

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("L'enregistrement micro n'est pas supporte par ce navigateur.");
      return;
    }

    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      recordedChunksRef.current = [];

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const mimeType = recorder.mimeType || "audio/webm";
        const blob = new Blob(recordedChunksRef.current, { type: mimeType });

        mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
        mediaRecorderRef.current = null;
        setRecording(false);

        if (blob.size === 0) {
          setError("Aucun son n'a ete capture.");
          return;
        }

        try {
          const audioContext = new AudioContext();
          const arrayBuffer = await blob.arrayBuffer();
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
          const wavBlob = encodeWav(audioBuffer);
          const file = new File([wavBlob], `reunion-${Date.now()}.wav`, { type: "audio/wav" });

          updateAudioPreview(blob, "Note vocale enregistree");
          setPendingAudioFile(file);
          setHasFreshTranscript(false);
          await transcribeAudioFile(file);
          await audioContext.close();
        } catch (conversionError) {
          setError(conversionError instanceof Error ? conversionError.message : "Impossible de convertir la note vocale en WAV.");
          setPendingAudioFile(null);
        }
      };

      recorder.start();
      setRecording(true);
    } catch (recordingError) {
      setError(recordingError instanceof Error ? recordingError.message : "Impossible de demarrer le micro.");
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
      mediaRecorderRef.current = null;
      setRecording(false);
    }
  };

  const generateDraft = async (sourceRawContent?: string) => {
    const effectiveRawContent = typeof sourceRawContent === "string" ? sourceRawContent : rawContent;

    if (!effectiveRawContent.trim()) {
      setError("Ajoute d'abord le compte-rendu brut pour lancer la synthese.");
      return;
    }

    setGenerating(true);
    setError(null);

    const response = await fetch("/api/meeting-notes/draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rawContent: effectiveRawContent,
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
    setExtractedActions(Array.isArray(payload.data.extractedActions) ? payload.data.extractedActions.map((draft: Partial<MeetingActionDraft>) => normalizeActionDraft(draft)) : []);
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

    const response = await fetch(currentMeetingNoteId ? `/api/meeting-notes/${currentMeetingNoteId}` : "/api/meeting-notes", {
      method: currentMeetingNoteId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildMeetingPayload())
    });
    const payload = await response.json();

    if (!response.ok) {
      setError(payload.error ?? "Une erreur est survenue.");
      setLoading(false);
      return;
    }

    if (!currentMeetingNoteId && payload.data?.id) {
      setCurrentMeetingNoteId(payload.data.id);
    }

    if (mode === "create" && currentMeetingNoteId) {
      resetForm();
      setCurrentMeetingNoteId(null);
    }

    setLoading(false);
    router.refresh();
  };

  const updateActionDraft = (index: number, patch: Partial<MeetingActionDraft>) => {
    setExtractedActions((current) => current.map((draft, currentIndex) => currentIndex === index ? normalizeActionDraft({ ...draft, ...patch }) : draft));
  };

  const addActionDraft = () => {
    setExtractedActions((current) => [...current, normalizeActionDraft()]);
  };

  const removeActionDraft = (index: number) => {
    setExtractedActions((current) => current.filter((_, currentIndex) => currentIndex !== index));
  };

  const createExtractedActions = async () => {
    setCreatingActions(true);
    setError(null);
    let resolvedMeetingNoteId = currentMeetingNoteId;

    const saveResponse = await fetch(resolvedMeetingNoteId ? `/api/meeting-notes/${resolvedMeetingNoteId}` : "/api/meeting-notes", {
      method: resolvedMeetingNoteId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildMeetingPayload())
    });

    if (!saveResponse.ok) {
      const payload = await saveResponse.json();
      setError(payload.error ?? "Impossible de sauvegarder la reunion avant creation des actions.");
      setCreatingActions(false);
      return;
    }

    const savePayload = await saveResponse.json();
    resolvedMeetingNoteId = savePayload.data?.id ?? resolvedMeetingNoteId;

    if (!resolvedMeetingNoteId) {
      setError("Impossible de retrouver l'identifiant de la reunion apres sauvegarde.");
      setCreatingActions(false);
      return;
    }

    setCurrentMeetingNoteId(resolvedMeetingNoteId);

    const response = await fetch(`/api/meeting-notes/${resolvedMeetingNoteId}/actions`, {
      method: "POST"
    });
    const payload = await response.json();

    if (!response.ok) {
      setError(payload.error ?? "Impossible de creer les actions.");
      setCreatingActions(false);
      return;
    }

    if (payload.data?.meetingNote?.extractedActions) {
      setExtractedActions(payload.data.meetingNote.extractedActions.map((draft: Partial<MeetingActionDraft>) => normalizeActionDraft(draft)));
    }

    setCreatingActions(false);
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="form-stack">
      {showHeader && <h2 className="panel-title">{mode === "create" ? "Nouvelle reunion" : "Modifier la reunion"}</h2>}
      <section className="space-y-4">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr),360px]">
          <section className="form-section space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="form-section-title">Brut et synthese</h3>
                <p className="form-section-caption">Le texte source reste central. Audio et generation sont des accelerateurs, pas une colonne a part.</p>
              </div>
              <button type="button" onClick={() => void generateDraft()} disabled={generating || transcribing || !rawContent.trim()} className="button-secondary">
                {generating ? "Generation..." : "Generer"}
              </button>
            </div>
            <div>
              <label className="field-label">Compte-rendu brut</label>
              <textarea
                value={rawContent}
                onChange={(event) => setRawContent(event.target.value)}
                rows={14}
                required
                placeholder="Colle ici tes notes de reunion, ton verbatim ou un compte-rendu brut."
                className="field-textarea min-h-[280px]"
              />
            </div>
            <div className="meeting-draft-toolbar">
              <div>
                <p className="meeting-draft-toolbar-title">Baguette magique</p>
                <p className="meeting-draft-toolbar-copy">Genere une synthese exploitable et pre-remplit actions, decisions, risques et echeances.</p>
              </div>
              <button type="button" onClick={() => void generateDraft()} disabled={generating || transcribing || !rawContent.trim()} className="button-primary">
                {generating ? "Generation..." : "Lancer l'analyse"}
              </button>
            </div>
          </section>

          <section className="space-y-4">
            <section className="form-section space-y-3">
              <div>
                <h3 className="form-section-title">Cadre</h3>
                <p className="form-section-caption">Le minimum utile pour retrouver et rattacher la reunion.</p>
              </div>
              <div className="space-y-3">
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
                <div className="grid gap-3 sm:grid-cols-2">
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
                </div>
              </div>
            </section>

            <section className="form-section space-y-3">
              <div>
                <h3 className="form-section-title">Audio</h3>
                <p className="form-section-caption">Importe ou enregistre, puis reinjecte la transcription dans le brut.</p>
              </div>
              <div className="meeting-audio-shell">
                <div className="meeting-audio-header">
                  <div className="flex flex-wrap gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="audio/*,.mp3,.m4a,.wav,.webm,.ogg,.mp4"
                      onChange={handleAudioFileChange}
                      className="hidden"
                    />
                    <button type="button" onClick={() => fileInputRef.current?.click()} disabled={transcribing || recording} className="button-secondary">
                      Importer
                    </button>
                    <button type="button" onClick={recording ? stopRecording : startRecording} disabled={transcribing} className="button-secondary">
                      {recording ? "Arreter" : "Enregistrer"}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={generateDraftFromAudio}
                    disabled={transcribing || generating || (!pendingAudioFile && (!audioLabel || !rawContent.trim()))}
                    className="button-primary"
                  >
                    {generating ? "Generation..." : "Transcrire puis analyser"}
                  </button>
                </div>
                    <p className="field-hint">Formats: MP3, M4A, WAV, WEBM, OGG, MP4.</p>
                {(transcribing || audioPreviewUrl || audioLabel) && (
                  <div className="meeting-audio-status">
                    <div>
                      <p className="meeting-audio-status-label">{transcribing ? "Transcription en cours..." : "Dernier audio"}</p>
                      <p className="meeting-audio-status-copy">{audioLabel ?? "Audio en attente de transcription"}</p>
                    </div>
                    {audioPreviewUrl ? <audio controls src={audioPreviewUrl} className="w-full md:w-[220px]" /> : null}
                  </div>
                )}
                {pendingAudioFile ? <p className="field-hint">Audio pret. Le clic lancera transcription puis synthese.</p> : null}
                {!pendingAudioFile && hasFreshTranscript ? <p className="field-hint">La transcription vient d&apos;etre ajoutee au brut.</p> : null}
              </div>
            </section>
          </section>
        </div>

        <section className="form-section space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="form-section-title">Synthese</h3>
              <p className="form-section-caption">Relis, coupe, reformule. Cette zone doit rester beaucoup plus simple que le brut.</p>
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
              {summary.trim() ? "Pre-remplie" : "Vide"}
            </span>
          </div>
          <textarea
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
            rows={7}
            className="field-textarea"
          />
        </section>

        <section className="form-section space-y-3">
          <div className="meeting-actions-header">
            <div>
              <p className="meeting-actions-title">Actions a sortir du compte-rendu</p>
              <p className="meeting-actions-copy">Travaille les brouillons ici, puis pousse-les en vraies actions quand c&apos;est propre.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={addActionDraft} className="button-secondary">
                Ajouter
              </button>
              <button
                type="button"
                onClick={createExtractedActions}
                disabled={creatingActions || extractedActions.filter((action) => !action.createdActionId && action.title.trim().length >= 3).length === 0}
                className="button-primary"
              >
                {creatingActions ? "Creation..." : "Creer les actions"}
              </button>
            </div>
          </div>
          <div className="space-y-3">
            {extractedActions.map((action, index) => (
              <div key={`${index}-${action.createdActionId ?? "draft"}`} className="meeting-action-card">
                <div className="meeting-action-card-header">
                  <div>
                    <p className="meeting-action-card-title">Action {index + 1}</p>
                    <p className="meeting-action-card-status">
                      {action.createdActionId ? `Creee (${action.createdActionId})` : "Brouillon"}
                    </p>
                  </div>
                  <button type="button" onClick={() => removeActionDraft(index)} className="button-secondary">
                    Retirer
                  </button>
                </div>
                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr),180px,180px]">
                  <div>
                    <label className="field-label">Intitule</label>
                    <input
                      value={action.title}
                      onChange={(event) => updateActionDraft(index, { title: event.target.value })}
                      className="field-input"
                    />
                  </div>
                  <div>
                    <label className="field-label">Responsable</label>
                    <input
                      value={action.ownerName ?? ""}
                      onChange={(event) => updateActionDraft(index, { ownerName: event.target.value })}
                      placeholder="Ex: Max Martin"
                      className="field-input"
                    />
                  </div>
                  <div>
                    <label className="field-label">Echeance</label>
                    <input
                      type="datetime-local"
                      value={action.dueDate ? new Date(action.dueDate).toISOString().slice(0, 16) : ""}
                      onChange={(event) => updateActionDraft(index, { dueDate: event.target.value ? new Date(event.target.value).toISOString() : null })}
                      className="field-input"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="field-label">Notes</label>
                    <textarea
                      value={action.notes ?? ""}
                      onChange={(event) => updateActionDraft(index, { notes: event.target.value })}
                      rows={2}
                      className="field-textarea"
                    />
                  </div>
                </div>
              </div>
            ))}
            {extractedActions.length === 0 ? (
              <div className="meeting-empty-state">
                Aucune action extraite pour l&apos;instant. Lance la generation ou ajoute une action manuellement.
              </div>
            ) : null}
            {!currentMeetingNoteId ? (
              <p className="field-hint">Si la reunion n&apos;existe pas encore, la creation des actions sauvegarde d&apos;abord la reunion.</p>
            ) : null}
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-3">
          <section className="form-section space-y-3">
            <div>
              <h3 className="form-section-title">Decisions</h3>
              <p className="form-section-caption">Ce qui a ete tranche.</p>
            </div>
            <textarea
              value={extractedDecisions}
              onChange={(event) => setExtractedDecisions(event.target.value)}
              rows={6}
              className="field-textarea"
            />
          </section>
          <section className="form-section space-y-3">
            <div>
              <h3 className="form-section-title">Risques</h3>
              <p className="form-section-caption">Points de vigilance a garder visibles.</p>
            </div>
            <textarea
              value={extractedRisks}
              onChange={(event) => setExtractedRisks(event.target.value)}
              rows={6}
              className="field-textarea"
            />
          </section>
          <section className="form-section space-y-3">
            <div>
              <h3 className="form-section-title">Echeances</h3>
              <p className="form-section-caption">Dates utiles extraites du compte-rendu.</p>
            </div>
            <textarea
              value={extractedDeadlines}
              onChange={(event) => setExtractedDeadlines(event.target.value)}
              rows={6}
              className="field-textarea"
            />
          </section>
        </section>
      </section>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="form-actions">
        <p className="form-actions-note">Le brut peut etre transforme avant sauvegarde, mais l&apos;enregistrement reste toujours sous ton controle.</p>
        <button disabled={loading || generating || creatingActions || transcribing || recording} className="button-primary">
          {loading ? (mode === "create" ? "Creation..." : "Enregistrement...") : mode === "create" ? "Creer la reunion" : "Enregistrer"}
        </button>
      </div>
    </form>
  );
}
