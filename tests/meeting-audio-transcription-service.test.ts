import { beforeEach, describe, expect, it, vi } from "vitest";

const loadAppSettingsSyncMock = vi.fn();
const execMock = vi.fn();
const transcribeAddonMock = vi.fn();
const writeFileMock = vi.fn();
const mkdtempMock = vi.fn();
const readFileMock = vi.fn();
const rmMock = vi.fn();

vi.mock("@/lib/settings/service", () => ({
  loadAppSettingsSync: loadAppSettingsSyncMock
}));

vi.mock("node:child_process", () => ({
  exec: execMock
}));

vi.mock("@kutalia/whisper-node-addon", () => ({
  transcribe: transcribeAddonMock
}));

vi.mock("node:fs/promises", () => ({
  default: {
    writeFile: writeFileMock,
    mkdtemp: mkdtempMock,
    readFile: readFileMock,
    rm: rmMock
  },
  writeFile: writeFileMock,
  mkdtemp: mkdtempMock,
  readFile: readFileMock,
  rm: rmMock
}));

describe("meeting-audio-transcription-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    delete (globalThis as { __CIO_EMBEDDED_WHISPER_ADDON__?: unknown }).__CIO_EMBEDDED_WHISPER_ADDON__;
    delete process.env.AI_AUDIO_TRANSCRIPTION_COMMAND;
    delete process.env.AI_AUDIO_TRANSCRIPTION_BASE_URL;
    delete process.env.AI_AUDIO_TRANSCRIPTION_MODEL;
    delete process.env.AI_AUDIO_TRANSCRIPTION_API_KEY;
    delete process.env.AI_COMPATIBLE_BASE_URL;
    delete process.env.AI_COMPATIBLE_MODEL;
    delete process.env.AI_COMPATIBLE_API_KEY;
    delete process.env.AI_AUDIO_TRANSCRIPTION_BACKEND;
    delete process.env.AI_AUDIO_TRANSCRIPTION_WHISPER_CPP_BIN;
    delete process.env.AI_AUDIO_TRANSCRIPTION_WHISPER_CPP_MODEL;
    delete process.env.AI_AUDIO_TRANSCRIPTION_WHISPER_CPP_THREADS;
    delete process.env.AI_AUDIO_TRANSCRIPTION_EMBEDDED_MODEL;
    delete process.env.AI_AUDIO_TRANSCRIPTION_EMBEDDED_THREADS;
    delete process.env.AI_AUDIO_TRANSCRIPTION_EMBEDDED_USE_GPU;
    process.env.AI_AUDIO_TRANSCRIPTION_AUTO_DISCOVER = "false";
    process.env.VITEST = "true";

    loadAppSettingsSyncMock.mockReset();
    execMock.mockReset();
    transcribeAddonMock.mockReset();
    writeFileMock.mockReset();
    mkdtempMock.mockReset();
    readFileMock.mockReset();
    rmMock.mockReset();
    mkdtempMock.mockResolvedValue("/tmp/meeting-audio-test");
    writeFileMock.mockResolvedValue(undefined);
    rmMock.mockResolvedValue(undefined);
    loadAppSettingsSyncMock.mockReturnValue({
      ai: {
        compatibleBaseUrl: "http://local-llm.test/v1",
        compatibleModel: "voxtral-mini-latest",
        compatibleApiKey: "local-token"
      }
    });
  });

  it("rejette les formats non audio", async () => {
    const { transcribeMeetingAudio } = await import("@/lib/services/meeting-audio-transcription-service");

    await expect(
      transcribeMeetingAudio(new File(["not audio"], "notes.txt", { type: "text/plain" }))
    ).rejects.toThrow("Format audio non supporte");
  });

  it("echoue si aucun backend local ou compatible n'est configure", async () => {
    loadAppSettingsSyncMock.mockReturnValue({
      ai: {
        compatibleBaseUrl: "",
        compatibleModel: "",
        compatibleApiKey: ""
      }
    });

    const { transcribeMeetingAudio } = await import("@/lib/services/meeting-audio-transcription-service");

    await expect(
      transcribeMeetingAudio(new File(["audio"], "reunion.webm", { type: "audio/webm" }))
    ).rejects.toThrow("Aucune transcription audio locale n'est configuree.");
  });

  it("utilise le backend embarque dans l'app si un modele est configure", async () => {
    process.env.AI_AUDIO_TRANSCRIPTION_BACKEND = "embedded";
    process.env.AI_AUDIO_TRANSCRIPTION_EMBEDDED_MODEL = "/models/ggml-base.bin";
    transcribeAddonMock.mockResolvedValue({
      transcription: [["Bonjour", "tout le monde"]]
    });
    (globalThis as { __CIO_EMBEDDED_WHISPER_ADDON__?: unknown }).__CIO_EMBEDDED_WHISPER_ADDON__ = {
      transcribe: transcribeAddonMock
    };
    (global as typeof globalThis & { __CIO_EMBEDDED_WHISPER_ADDON__?: unknown }).__CIO_EMBEDDED_WHISPER_ADDON__ = {
      transcribe: transcribeAddonMock
    };
    mkdtempMock.mockResolvedValue("/tmp/meeting-audio-embedded-test");

    const { transcribeMeetingAudio } = await import("@/lib/services/meeting-audio-transcription-service");
    const result = await transcribeMeetingAudio(new File(["audio"], "reunion.wav", { type: "audio/wav" }));

    expect(transcribeAddonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        fname_inp: "/tmp/meeting-audio-embedded-test/input.wav",
        model: "/models/ggml-base.bin",
        language: "fr",
        translate: false,
        no_prints: true
      })
    );
    expect(result).toEqual(
      expect.objectContaining({
        text: "Bonjour tout le monde",
        provider: "embedded-addon",
        model: "/models/ggml-base.bin"
      })
    );
  });

  it("utilise whisper.cpp si un modele local est configure", async () => {
    process.env.AI_AUDIO_TRANSCRIPTION_BACKEND = "whispercpp";
    process.env.AI_AUDIO_TRANSCRIPTION_WHISPER_CPP_MODEL = "/models/ggml-base.bin";
    process.env.AI_AUDIO_TRANSCRIPTION_WHISPER_CPP_BIN = "/usr/local/bin/whisper-cli";

    execMock.mockImplementation((_command: string, _options: unknown, callback: (error: Error | null, result: { stdout: string; stderr: string }) => void) => {
      callback(null, { stdout: "", stderr: "" });
      return {} as never;
    });

    mkdtempMock.mockResolvedValue("/tmp/meeting-audio-whispercpp-test");
    readFileMock.mockResolvedValue("Transcription locale whisper.cpp");

    const { transcribeMeetingAudio } = await import("@/lib/services/meeting-audio-transcription-service");
    const result = await transcribeMeetingAudio(new File(["audio"], "reunion.wav", { type: "audio/wav" }));

    expect(execMock).toHaveBeenCalledWith(
      expect.stringContaining("/usr/local/bin/whisper-cli"),
      expect.any(Object),
      expect.any(Function)
    );
    expect(writeFileMock).toHaveBeenCalled();
    expect(readFileMock).toHaveBeenCalledWith("/tmp/meeting-audio-whispercpp-test/transcript.txt", "utf-8");
    expect(rmMock).toHaveBeenCalled();
    expect(result).toEqual(
      expect.objectContaining({
        text: "Transcription locale whisper.cpp",
        provider: "whisper.cpp",
        model: "/models/ggml-base.bin"
      })
    );
  });

  it("appelle un endpoint compatible audio et retourne la transcription texte", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("Transcription de reunion", { status: 200 })
    );

    const { transcribeMeetingAudio } = await import("@/lib/services/meeting-audio-transcription-service");
    const result = await transcribeMeetingAudio(new File(["audio"], "reunion.webm", { type: "audio/webm" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "http://local-llm.test/v1/audio/transcriptions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer local-token"
        }),
        body: expect.any(FormData)
      })
    );
    expect(result).toEqual(
      expect.objectContaining({
        text: "Transcription de reunion",
        fileName: "reunion.webm",
        provider: "compatible",
        model: "voxtral-mini-latest"
      })
    );
  });
});
