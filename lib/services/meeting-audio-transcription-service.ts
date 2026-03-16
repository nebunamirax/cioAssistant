import { existsSync } from "node:fs";
import * as fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { exec as execCallback } from "node:child_process";
import { promisify } from "node:util";
import { loadAppSettingsSync } from "@/lib/settings/service";

const exec = promisify(execCallback);
const MAX_AUDIO_FILE_SIZE_BYTES = 25 * 1024 * 1024;
const FALLBACK_TRANSCRIPTION_MODEL = process.env.AI_AUDIO_TRANSCRIPTION_MODEL?.trim() || "voxtral-mini-latest";
const acceptedAudioExtensions = new Set([".mp3", ".mp4", ".mpeg", ".mpga", ".m4a", ".wav", ".webm", ".ogg"]);
const DEFAULT_WHISPER_CPP_THREADS = process.env.AI_AUDIO_TRANSCRIPTION_WHISPER_CPP_THREADS?.trim() || "4";
const DEFAULT_EMBEDDED_THREADS = process.env.AI_AUDIO_TRANSCRIPTION_EMBEDDED_THREADS?.trim() || "4";
const DEFAULT_EMBEDDED_MODEL_PATH = path.join(process.cwd(), ".models", "ggml-base.bin");
const EMBEDDED_ADDON_ENTRYPOINT = path.join(process.cwd(), "node_modules", "@kutalia", "whisper-node-addon", "dist", "js", "index.js");

type EmbeddedAddonModule = {
  transcribe: (options: Record<string, unknown>) => Promise<{ transcription: string[][] | string[] }>;
};

function shouldAutoDiscoverEmbeddedModel() {
  return (process.env.AI_AUDIO_TRANSCRIPTION_AUTO_DISCOVER?.trim() || "true").toLowerCase() !== "false";
}

function loadEmbeddedAddonModule() {
  const globalOverride =
    (globalThis as { __CIO_EMBEDDED_WHISPER_ADDON__?: EmbeddedAddonModule }).__CIO_EMBEDDED_WHISPER_ADDON__
    || (global as typeof globalThis & { __CIO_EMBEDDED_WHISPER_ADDON__?: EmbeddedAddonModule }).__CIO_EMBEDDED_WHISPER_ADDON__;

  if (globalOverride) {
    return globalOverride;
  }

  const requireFn = eval("require") as (id: string) => unknown;

  if (process.env.VITEST || process.env.NODE_ENV === "test") {
    return requireFn("@kutalia/whisper-node-addon") as EmbeddedAddonModule;
  }

  try {
    return requireFn(EMBEDDED_ADDON_ENTRYPOINT) as EmbeddedAddonModule;
  } catch (entrypointError) {
    try {
      return requireFn("@kutalia/whisper-node-addon") as EmbeddedAddonModule;
    } catch {
      const message = entrypointError instanceof Error ? entrypointError.message : "unknown error";
      throw new Error(`Failed to load native addon: ${message}`);
    }
  }
}

function getFileExtension(fileName: string) {
  const index = fileName.lastIndexOf(".");
  return index >= 0 ? fileName.slice(index).toLowerCase() : "";
}

function isAcceptedAudioFile(file: File) {
  if (file.type.startsWith("audio/")) {
    return true;
  }

  return acceptedAudioExtensions.has(getFileExtension(file.name));
}

function resolveCompatibleTranscriptionConfig() {
  const settings = loadAppSettingsSync();

  return {
    baseUrl:
      process.env.AI_AUDIO_TRANSCRIPTION_BASE_URL?.trim()
      || settings?.ai?.compatibleBaseUrl?.trim()
      || process.env.AI_COMPATIBLE_BASE_URL?.trim()
      || process.env.AI_EXTERNAL_BASE_URL?.trim()
      || "",
    model:
      process.env.AI_AUDIO_TRANSCRIPTION_MODEL?.trim()
      || settings?.ai?.compatibleModel?.trim()
      || process.env.AI_COMPATIBLE_MODEL?.trim()
      || process.env.AI_MODEL?.trim()
      || FALLBACK_TRANSCRIPTION_MODEL,
    apiKey:
      process.env.AI_AUDIO_TRANSCRIPTION_API_KEY?.trim()
      || settings?.ai?.compatibleApiKey?.trim()
      || process.env.AI_COMPATIBLE_API_KEY?.trim()
      || process.env.AI_EXTERNAL_API_KEY?.trim()
      || ""
  };
}

function resolveLocalCommand() {
  return process.env.AI_AUDIO_TRANSCRIPTION_COMMAND?.trim() || "";
}

function resolveWhisperCppConfig() {
  return {
    enabled:
      process.env.AI_AUDIO_TRANSCRIPTION_BACKEND?.trim() === "whispercpp"
      || Boolean(process.env.AI_AUDIO_TRANSCRIPTION_WHISPER_CPP_MODEL?.trim()),
    binPath: process.env.AI_AUDIO_TRANSCRIPTION_WHISPER_CPP_BIN?.trim() || "whisper-cli",
    modelPath: process.env.AI_AUDIO_TRANSCRIPTION_WHISPER_CPP_MODEL?.trim() || "",
    threads: process.env.AI_AUDIO_TRANSCRIPTION_WHISPER_CPP_THREADS?.trim() || DEFAULT_WHISPER_CPP_THREADS
  };
}

function resolveEmbeddedAddonConfig() {
  const configuredModelPath =
    process.env.AI_AUDIO_TRANSCRIPTION_EMBEDDED_MODEL?.trim()
    || "";
  const modelPath = configuredModelPath || (shouldAutoDiscoverEmbeddedModel() && existsSync(DEFAULT_EMBEDDED_MODEL_PATH) ? DEFAULT_EMBEDDED_MODEL_PATH : "");

  return {
    enabled:
      process.env.AI_AUDIO_TRANSCRIPTION_BACKEND?.trim() === "embedded"
      || Boolean(modelPath),
    modelPath,
    useGpu:
      (process.env.AI_AUDIO_TRANSCRIPTION_EMBEDDED_USE_GPU?.trim() || "false").toLowerCase() === "true",
    threads: Number(process.env.AI_AUDIO_TRANSCRIPTION_EMBEDDED_THREADS?.trim() || DEFAULT_EMBEDDED_THREADS)
  };
}

function resolveAudioBackendPreference() {
  return process.env.AI_AUDIO_TRANSCRIPTION_BACKEND?.trim().toLowerCase() || "";
}

function quoteShellArg(value: string) {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

async function transcribeWithLocalCommand(file: File) {
  const commandTemplate = resolveLocalCommand();

  if (!commandTemplate) {
    return null;
  }

  const extension = getFileExtension(file.name) || ".webm";
  const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "meeting-audio-"));
  const inputPath = path.join(tempDirectory, `input${extension}`);

  try {
    await fs.writeFile(inputPath, Buffer.from(await file.arrayBuffer()));

    const command = commandTemplate.includes("{input}")
      ? commandTemplate.replaceAll("{input}", quoteShellArg(inputPath))
      : `${commandTemplate} ${quoteShellArg(inputPath)}`;

    const { stdout, stderr } = await exec(command, {
      maxBuffer: 10 * 1024 * 1024
    });
    const transcript = stdout.trim();

    if (!transcript) {
      throw new Error(stderr.trim() || "La commande locale n'a retourne aucune transcription.");
    }

    return {
      text: transcript,
      provider: "local-command",
      model: "external-command"
    };
  } finally {
    await fs.rm(tempDirectory, { recursive: true, force: true });
  }
}

async function transcribeWithEmbeddedAddon(file: File) {
  const config = resolveEmbeddedAddonConfig();

  if (!config.enabled || !config.modelPath) {
    return null;
  }

  const extension = getFileExtension(file.name) || ".wav";
  const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "meeting-audio-embedded-"));
  const inputPath = path.join(tempDirectory, `input${extension}`);

  try {
    await fs.writeFile(inputPath, Buffer.from(await file.arrayBuffer()));

    const whisperModule = loadEmbeddedAddonModule();
    const result = await whisperModule.transcribe({
      fname_inp: inputPath,
      model: config.modelPath,
      language: "fr",
      translate: false,
      use_gpu: config.useGpu,
      no_prints: true,
      n_threads: Number.isFinite(config.threads) ? config.threads : Number(DEFAULT_EMBEDDED_THREADS)
    });

    const transcript = Array.isArray(result.transcription)
      ? result.transcription
          .flatMap((chunk) => Array.isArray(chunk) ? chunk : [chunk])
          .map((value) => String(value).trim())
          .filter(Boolean)
          .join(" ")
          .trim()
      : "";

    if (!transcript) {
      throw new Error("Le backend embarque n'a retourne aucune transcription.");
    }

    return {
      text: transcript,
      provider: "embedded-addon",
      model: config.modelPath
    };
  } finally {
    await fs.rm(tempDirectory, { recursive: true, force: true });
  }
}

async function transcribeWithWhisperCpp(file: File) {
  const config = resolveWhisperCppConfig();

  if (!config.enabled || !config.modelPath) {
    return null;
  }

  const extension = getFileExtension(file.name) || ".wav";
  const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "meeting-audio-whispercpp-"));
  const inputPath = path.join(tempDirectory, `input${extension}`);
  const outputBasePath = path.join(tempDirectory, "transcript");

  try {
    await fs.writeFile(inputPath, Buffer.from(await file.arrayBuffer()));

    const command = [
      quoteShellArg(config.binPath),
      "-m",
      quoteShellArg(config.modelPath),
      "-f",
      quoteShellArg(inputPath),
      "-l",
      "fr",
      "-t",
      quoteShellArg(config.threads),
      "-otxt",
      "-of",
      quoteShellArg(outputBasePath),
      "-np"
    ].join(" ");

    await exec(command, {
      maxBuffer: 10 * 1024 * 1024
    });

    const transcript = (await fs.readFile(`${outputBasePath}.txt`, "utf-8")).trim();

    if (!transcript) {
      throw new Error("whisper.cpp n'a retourne aucune transcription.");
    }

    return {
      text: transcript,
      provider: "whisper.cpp",
      model: config.modelPath
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur whisper.cpp";
    throw new Error(`Echec whisper.cpp: ${message}`);
  } finally {
    await fs.rm(tempDirectory, { recursive: true, force: true });
  }
}

async function transcribeWithCompatibleEndpoint(file: File) {
  const config = resolveCompatibleTranscriptionConfig();

  if (!config.baseUrl || !config.model) {
    return null;
  }

  const formData = new FormData();
  formData.append("file", file, file.name || "meeting-audio.webm");
  formData.append("model", config.model);
  formData.append("language", "fr");
  formData.append("response_format", "text");
  formData.append(
    "prompt",
    "Transcris fidelement cette reunion en francais. Preserve les noms propres, actions, decisions, risques et echeances."
  );

  const response = await fetch(`${config.baseUrl.replace(/\/$/, "")}/audio/transcriptions`, {
    method: "POST",
    headers: config.apiKey
      ? {
          Authorization: `Bearer ${config.apiKey}`
        }
      : undefined,
    body: formData
  });

  const transcript = (await response.text()).trim();

  if (!response.ok) {
    throw new Error(transcript || `Echec de transcription compatible (${response.status}).`);
  }

  if (!transcript) {
    throw new Error("Le provider compatible n'a retourne aucun texte exploitable.");
  }

  return {
    text: transcript,
    provider: "compatible",
    model: config.model
  };
}

export async function transcribeMeetingAudio(file: File) {
  if (!file || file.size === 0) {
    throw new Error("Aucun fichier audio n'a ete fourni.");
  }

  if (!isAcceptedAudioFile(file)) {
    throw new Error("Format audio non supporte. Utilise MP3, M4A, WAV, WEBM, OGG ou MP4.");
  }

  if (file.size > MAX_AUDIO_FILE_SIZE_BYTES) {
    throw new Error("Le fichier audio depasse la limite de 25 Mo.");
  }

  const backendPreference = resolveAudioBackendPreference();
  const attempts = backendPreference === "embedded"
    ? [transcribeWithEmbeddedAddon, transcribeWithWhisperCpp, transcribeWithLocalCommand, transcribeWithCompatibleEndpoint]
    : backendPreference === "whispercpp"
      ? [transcribeWithWhisperCpp, transcribeWithEmbeddedAddon, transcribeWithLocalCommand, transcribeWithCompatibleEndpoint]
      : backendPreference === "command"
        ? [transcribeWithLocalCommand, transcribeWithEmbeddedAddon, transcribeWithWhisperCpp, transcribeWithCompatibleEndpoint]
        : backendPreference === "compatible"
          ? [transcribeWithCompatibleEndpoint, transcribeWithEmbeddedAddon, transcribeWithWhisperCpp, transcribeWithLocalCommand]
          : [transcribeWithEmbeddedAddon, transcribeWithWhisperCpp, transcribeWithLocalCommand, transcribeWithCompatibleEndpoint];

  for (const attempt of attempts) {
    const result = await attempt(file);

    if (result) {
      return {
        ...result,
        fileName: file.name,
        mimeType: file.type || null,
        size: file.size
      };
    }
  }

  throw new Error(
    "Aucune transcription audio locale n'est configuree. Configure le backend embarque, whisper.cpp, AI_AUDIO_TRANSCRIPTION_COMMAND ou un endpoint compatible audio."
  );
}

export const meetingAudioTranscriptionConfig = {
  acceptedAudioExtensions,
  maxAudioFileSizeBytes: MAX_AUDIO_FILE_SIZE_BYTES
};
