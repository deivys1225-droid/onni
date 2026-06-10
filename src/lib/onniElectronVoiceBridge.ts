import { isElectronDesktopApp } from "@/lib/deviceDetection";
import { pickOnniSpanishVoice } from "@/lib/onniVoice";

type NativeVoiceBridge = {
  startListening: () => void;
  stopListening: () => void;
  speak: (text: string) => void;
  stopSpeaking: () => void;
};

let resolvedBridge: NativeVoiceBridge | null | undefined;
let resolveBridgePromise: Promise<NativeVoiceBridge | null> | null = null;

function speakDesktop(text: string) {
  if (!text.trim() || typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const clean = text.replace(/\n+/g, ". ").trim();
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(clean);
  const voice = pickOnniSpanishVoice(window.speechSynthesis.getVoices());
  utterance.lang = voice?.lang ?? "es-CO";
  if (voice) utterance.voice = voice;
  window.speechSynthesis.speak(utterance);
}

/** .exe: solo TTS local; escucha/mic deshabilitado. */
const speakOnlyBridge: NativeVoiceBridge = {
  startListening() {},
  stopListening() {},
  speak: speakDesktop,
  stopSpeaking() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  },
};

function getSpeakOnlyBridge(): NativeVoiceBridge | null {
  if (!isElectronDesktopApp()) return null;
  return speakOnlyBridge;
}

export function warmUpElectronVoiceBridge(): Promise<NativeVoiceBridge | null> {
  if (resolvedBridge !== undefined) {
    return Promise.resolve(resolvedBridge);
  }
  if (!resolveBridgePromise) {
    resolveBridgePromise = Promise.resolve(getSpeakOnlyBridge()).then((bridge) => {
      resolvedBridge = bridge;
      return bridge;
    });
  }
  return resolveBridgePromise;
}

export function getElectronVoiceBridge(): NativeVoiceBridge | null {
  if (resolvedBridge !== undefined) return resolvedBridge;
  return getSpeakOnlyBridge();
}
