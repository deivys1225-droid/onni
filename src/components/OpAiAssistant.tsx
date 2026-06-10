import { FormEvent, useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Mic, MicOff, Send, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import OnniAvatarDots from "@/components/OnniAvatarDots";
import { dispatchOpCommand } from "@/lib/opCommandBus";
import { getOnniIntroduction } from "@/data/onniBrain";
import { toast } from "sonner";
import { getOpAssistantHint, resolveOpCommand, shouldAskOnniGemini } from "@/lib/opAssistantResolver";
import { askOnniGemini, isOnniNavigationResult } from "@/lib/onniGemini";
import { extractWikipediaTopic, fetchWikipediaSummary } from "@/lib/wikipediaSummary";
import { shouldShowNativeVoiceError } from "@/lib/onniNativeVoiceErrors";
import OpAiAndroidAzureMic from "@/components/OpAiAndroidAzureMic";
import OpAiElectronAzureMic from "@/components/OpAiElectronAzureMic";
import { useOnniAzureMic } from "@/hooks/useOnniAzureMic";
import { useOnniChatVoice } from "@/hooks/useOnniChatVoice";
import { useOnniVoice, useOnniVoicePrefs } from "@/hooks/useOnniVoice";
import { useAuth } from "@/hooks/useAuth";
import { isDesktopWebBrowser, isElectronDesktopApp, isOnniAndroidVoice } from "@/lib/deviceDetection";
import { isAzureMicSupported } from "@/lib/onniAzureStt";
import { onniMicDeniedMessage, requestOnniMicrophoneAccess } from "@/lib/requestOnniMicrophone";
import type { OnniSpeakOptions } from "@/lib/onniVoiceRuntime";
import { supabase } from "@/integrations/supabase/client";

type UiMessage = { role: "user" | "assistant"; text: string };

function isEditableKeyboardTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return target.isContentEditable;
}

function appendAssistantAnswer(
  setMessages: Dispatch<SetStateAction<UiMessage[]>>,
  sessionRef: MutableRefObject<{ lastAnswer?: string; lastAnswerFromGemini?: boolean }>,
  answer: string,
  speak: (text: string, options?: OnniSpeakOptions) => void,
  speakOptions?: OnniSpeakOptions,
) {
  sessionRef.current.lastAnswer = answer;
  sessionRef.current.lastAnswerFromGemini = speakOptions?.fromGemini ?? false;
  setMessages((prev) => [...prev, { role: "assistant", text: answer }]);
  speak(answer, speakOptions);
}

export default function OpAiAssistant() {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [androidMicState, setAndroidMicState] = useState({ isRecording: false, isProcessing: false });
  const [electronMicState, setElectronMicState] = useState({ isRecording: false, isProcessing: false });
  const [text, setText] = useState("");
  const [processing, setProcessing] = useState(false);
  const [messages, setMessages] = useState<UiMessage[]>([
    { role: "assistant", text: getOnniIntroduction() },
  ]);
  const sessionRef = useRef<{ lastAnswer?: string; lastAnswerFromGemini?: boolean }>({});
  const appRoleRef = useRef<string | null>(null);
  const pendingVoiceRef = useRef("");
  const electronSpaceHoldRef = useRef(false);
  const chromeSpaceHoldRef = useRef(false);
  const { listenEnabled } = useOnniVoicePrefs();
  const { user } = useAuth();
  const [appRole, setAppRole] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) {
      setAppRole(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("app_role")
        .eq("id", user.id)
        .maybeSingle();
      if (!cancelled) {
        setAppRole((data as { app_role?: string } | null)?.app_role ?? "particular");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  appRoleRef.current = appRole;

  const {
    voiceListening,
    nativeWakeListening,
    voiceCaptureActive,
    setVoiceListening,
    speakAnswer,
    startVoiceCapture,
    stopVoiceCapture,
    toggleVoiceCapture,
    startNativeWakeListening,
    stopNativeWakeListening,
    usesContinuousMic,
    usesOneShotNativeMic,
    supportsNativeWakeSwitch,
    electronFollowUpActive,
    canListen,
    canSpeak,
  } = useOnniChatVoice();

  const showAzureMic = isOnniAndroidVoice() && isAzureMicSupported();
  const showElectronMic = isElectronDesktopApp() && isAzureMicSupported();
  /** Chrome/Edge escritorio: mic Web Speech mantener pulsado + Espacio. */
  const showChromeWebPushToTalk = isDesktopWebBrowser() && canListen;

  const runCommandRef = useRef<(raw: string) => Promise<string | undefined>>(async () => undefined);
  const openRef = useRef(open);
  openRef.current = open;

  const hint = useMemo(() => getOpAssistantHint(location.pathname), [location.pathname]);
  const isHomePortada = location.pathname === "/";

  const runCommand = useCallback(
    async (raw: string) => {
      const trimmed = raw.trim();
      if (!trimmed) return;

      setMessages((prev) => [...prev, { role: "user", text: trimmed }]);
      setProcessing(true);

      try {
        let roleForCommand = appRoleRef.current;
        if (roleForCommand === null && user?.id) {
          const { data } = await supabase
            .from("profiles")
            .select("app_role")
            .eq("id", user.id)
            .maybeSingle();
          roleForCommand = (data as { app_role?: string } | null)?.app_role ?? "particular";
          appRoleRef.current = roleForCommand;
          setAppRole(roleForCommand);
        }

        const result = resolveOpCommand(trimmed, location.pathname, {
          lastAnswer: sessionRef.current.lastAnswer,
          appRole: roleForCommand,
        });

        if (isOnniNavigationResult(result)) {
          sessionRef.current.lastAnswer = result.answer;

          if (result.navigateBack) {
            navigate(-1);
          } else if (result.navigateTo) {
            const [path, hash] = result.navigateTo.split("#");
            if (hash) {
              navigate(path);
              window.setTimeout(() => {
                document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
              }, 400);
            } else {
              navigate(result.navigateTo);
            }
          }
          if (result.command) {
            const isDocenteVoiceCmd =
              result.command.type === "docente.startClass" ||
              result.command.type === "docente.enterClass" ||
              result.command.type === "docente.endClass";
            const needsMountDelay = Boolean(result.navigateTo) && isDocenteVoiceCmd;
            const dispatchDelay = needsMountDelay ? 1_000 : isDocenteVoiceCmd ? 300 : 0;
            window.setTimeout(() => dispatchOpCommand(result.command!), dispatchDelay);
          }
          appendAssistantAnswer(setMessages, sessionRef, result.answer, speakAnswer);
          return result.answer;
        }

        if (!shouldAskOnniGemini(result)) {
          sessionRef.current.lastAnswer = result.answer;
          appendAssistantAnswer(setMessages, sessionRef, result.answer, speakAnswer);
          return result.answer;
        }

        const geminiAnswer = await askOnniGemini({
          message: trimmed,
          contextPath: location.pathname,
        });
        const asksAboutGemini = /\b(gemini|ia externa|conectad[ao]?\s+a?\s*gemini)\b/i.test(trimmed);
        if (geminiAnswer) {
          appendAssistantAnswer(setMessages, sessionRef, geminiAnswer, speakAnswer, { fromGemini: true });
          return geminiAnswer;
        }

        if (asksAboutGemini) {
          const fallbackGemini =
            "Sí, estoy conectada a Google Gemini para preguntas libres. Ahora mismo la API no respondió (cuota o red); inténtalo de nuevo en un minuto.";
          appendAssistantAnswer(setMessages, sessionRef, fallbackGemini, speakAnswer, { fromGemini: true });
          return fallbackGemini;
        }

        const wikiTopic = extractWikipediaTopic(trimmed);
        if (wikiTopic) {
          try {
            const wiki = await fetchWikipediaSummary(wikiTopic);
            const shortAnswer = wiki
              ? `${wiki.title}: ${wiki.shortText}`
              : "No encontré un resultado claro en Wikipedia para eso. Prueba con otro nombre.";
            appendAssistantAnswer(setMessages, sessionRef, shortAnswer, speakAnswer);
            return shortAnswer;
          } catch {
            /* Wikipedia falló; seguimos con la respuesta local */
          }
        }

        sessionRef.current.lastAnswer = result.answer;
        appendAssistantAnswer(setMessages, sessionRef, result.answer, speakAnswer);
        return result.answer;
      } finally {
        setProcessing(false);
      }
    },
    [location.pathname, navigate, speakAnswer, user?.id],
  );

  runCommandRef.current = runCommand;

  const azureMicCallbacks = useMemo(
    () => ({
      onCommand: (command: string) => {
        void runCommandRef.current(command);
      },
      onWakeWithoutCommand: () => {
        const prompt = getOnniIntroduction();
        sessionRef.current.lastAnswer = prompt;
        if (openRef.current) {
          setMessages((prev) => [
            ...prev,
            { role: "user", text: "Hola Onni" },
            { role: "assistant", text: prompt },
          ]);
        }
        speakAnswer(prompt);
      },
      onError: (message: string) => {
        if (openRef.current) {
          setMessages((prev) => [...prev, { role: "assistant", text: message }]);
        } else {
          toast.error(message);
        }
      },
    }),
    [speakAnswer],
  );

  const electronAzureMic = useOnniAzureMic(azureMicCallbacks);
  const {
    isRecording: electronMicRecording,
    isProcessing: electronMicProcessing,
    beginHold: electronMicBeginHold,
    endHold: electronMicEndHold,
    cancel: electronMicCancel,
  } = electronAzureMic;

  useEffect(() => {
    if (!showElectronMic) return;
    setElectronMicState({
      isRecording: electronMicRecording,
      isProcessing: electronMicProcessing,
    });
  }, [showElectronMic, electronMicRecording, electronMicProcessing]);

  useEffect(() => {
    if (!showElectronMic || open || electronSpaceHoldRef.current) return;
    electronMicCancel();
  }, [open, showElectronMic, electronMicCancel]);

  useEffect(() => {
    if (!showElectronMic) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space" && event.key !== " ") return;
      if (event.repeat) return;
      if (isEditableKeyboardTarget(event.target)) return;
      if (processing || electronMicProcessing) return;
      event.preventDefault();
      electronSpaceHoldRef.current = true;
      void electronMicBeginHold();
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code !== "Space" && event.key !== " ") return;
      if (!electronSpaceHoldRef.current) return;
      electronSpaceHoldRef.current = false;
      event.preventDefault();
      void electronMicEndHold();
    };

    const onBlur = () => {
      if (!electronSpaceHoldRef.current) return;
      electronSpaceHoldRef.current = false;
      void electronMicEndHold();
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, [
    showElectronMic,
    processing,
    electronMicProcessing,
    electronMicBeginHold,
    electronMicEndHold,
  ]);

  const wakeWordActive =
    isDesktopWebBrowser() &&
    listenEnabled &&
    canListen &&
    !processing &&
    !voiceCaptureActive;

  const captureMicActive = voiceCaptureActive;

  const nativeWakeActive =
    !isOnniAndroidVoice() &&
    !isElectronDesktopApp() &&
    !isDesktopWebBrowser() &&
    supportsNativeWakeSwitch &&
    canListen &&
    !processing &&
    !voiceCaptureActive;

  const { isListening: wakeListening, isSpeaking: wakeSpeaking } = useOnniVoice({
    enabled: wakeWordActive,
    speakEnabled: canSpeak,
    onWake: (command) => {
      void runCommandRef.current(command);
    },
    onWakeWithoutCommand: () => {
      const prompt = getOnniIntroduction();
      sessionRef.current.lastAnswer = prompt;
      setMessages((prev) => [
        ...prev,
        { role: "user", text: "Hola Onni" },
        { role: "assistant", text: prompt },
      ]);
      speakAnswer(prompt);
    },
      onError: (message) => {
        if (!shouldShowNativeVoiceError(message)) return;
        if (openRef.current) {
        setMessages((prev) => [...prev, { role: "assistant", text: message }]);
      } else {
        toast.error(message);
      }
    },
  });

  const avatarState =
    wakeSpeaking
      ? "speaking"
      : wakeListening ||
          voiceListening ||
          nativeWakeListening ||
          androidMicState.isRecording ||
          electronMicState.isRecording ||
          captureMicActive
        ? "listening"
        : "idle";

  const nativeWakeCallbacks = useMemo(
    () => ({
      onWake: (command: string) => {
        void runCommandRef.current(command);
      },
      onWakeWithoutCommand: () => {
        const prompt = getOnniIntroduction();
        sessionRef.current.lastAnswer = prompt;
        if (openRef.current) {
          setMessages((prev) => [
            ...prev,
            { role: "user", text: "Hola Onni" },
            { role: "assistant", text: prompt },
          ]);
        }
        speakAnswer(prompt);
      },
      onError: (message: string) => {
        if (!shouldShowNativeVoiceError(message)) return;
        if (openRef.current) {
          setMessages((prev) => [...prev, { role: "assistant", text: message }]);
        } else {
          toast.error(message);
        }
      },
    }),
    [speakAnswer],
  );
  const nativeWakeCallbacksRef = useRef(nativeWakeCallbacks);
  nativeWakeCallbacksRef.current = nativeWakeCallbacks;

  useEffect(() => {
    if (isOnniAndroidVoice()) return;

    if (!nativeWakeActive) {
      stopNativeWakeListening();
      return;
    }

    let cancelled = false;
    void startNativeWakeListening(nativeWakeCallbacksRef.current).then((started) => {
      if (!cancelled && !started) stopNativeWakeListening();
    });

    return () => {
      cancelled = true;
      stopNativeWakeListening();
    };
  }, [nativeWakeActive, startNativeWakeListening, stopNativeWakeListening]);

  const voiceCallbacks = useMemo(
    () => ({
      onTranscript: (transcript: string) => {
        setText("");
        void runCommand(transcript);
      },
      onError: (errorText: string) => {
        if (!shouldShowNativeVoiceError(errorText)) return;
        if (openRef.current) {
          setMessages((prev) => [...prev, { role: "assistant", text: errorText }]);
        } else {
          toast.error(errorText);
        }
      },
      onFallbackToNative: () => {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            text: "La voz del navegador no respondió; uso la voz nativa de la app.",
          },
        ]);
      },
    }),
    [runCommand],
  );

  const handleStartVoiceCapture = useCallback(async () => {
    pendingVoiceRef.current = "";
    setText("");
    const permission = await requestOnniMicrophoneAccess();
    if (permission === "denied") {
      voiceCallbacks.onError(onniMicDeniedMessage());
      return;
    }
    if (permission === "unsupported") {
      voiceCallbacks.onError("Micrófono no disponible en este dispositivo.");
      return;
    }
    startVoiceCapture(voiceCallbacks);
  }, [startVoiceCapture, voiceCallbacks]);

  const handleToggleVoiceCapture = useCallback(() => {
    pendingVoiceRef.current = "";
    setText("");
    void toggleVoiceCapture(voiceCallbacks);
  }, [toggleVoiceCapture, voiceCallbacks]);

  const stopVoiceCaptureHandler = useCallback(() => {
    const transcript = stopVoiceCapture();
    setText("");
    if (transcript) void runCommand(transcript);
  }, [runCommand, stopVoiceCapture]);

  useEffect(() => {
    if (!showChromeWebPushToTalk || open || chromeSpaceHoldRef.current) return;
    if (voiceCaptureActive) stopVoiceCapture();
  }, [open, showChromeWebPushToTalk, voiceCaptureActive, stopVoiceCapture]);

  useEffect(() => {
    if (!showChromeWebPushToTalk) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space" && event.key !== " ") return;
      if (event.repeat) return;
      if (isEditableKeyboardTarget(event.target)) return;
      if (processing || captureMicActive) return;
      event.preventDefault();
      chromeSpaceHoldRef.current = true;
      handleStartVoiceCapture();
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code !== "Space" && event.key !== " ") return;
      if (!chromeSpaceHoldRef.current) return;
      chromeSpaceHoldRef.current = false;
      event.preventDefault();
      stopVoiceCaptureHandler();
    };

    const onBlur = () => {
      if (!chromeSpaceHoldRef.current) return;
      chromeSpaceHoldRef.current = false;
      stopVoiceCaptureHandler();
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, [
    showChromeWebPushToTalk,
    processing,
    captureMicActive,
    handleStartVoiceCapture,
    stopVoiceCaptureHandler,
  ]);

  const onSpeakLastAnswer = useCallback(() => {
    const textToSpeak = sessionRef.current.lastAnswer?.trim();
    if (!textToSpeak) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "Aún no tengo una respuesta para leer en voz alta." },
      ]);
      return;
    }
    if (!canSpeak) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "La voz no está disponible en este navegador." },
      ]);
      return;
    }
    speakAnswer(textToSpeak, {
      fromGemini: sessionRef.current.lastAnswerFromGemini ?? false,
    });
  }, [canSpeak, speakAnswer]);

  const onSend = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    setText("");
    void runCommand(trimmed);
  };

  return (
    <div
      className={`pointer-events-none fixed z-[80] w-[min(92vw,380px)] max-sm:flex max-sm:flex-col max-sm:items-start max-sm:gap-2 sm:block ${
        isHomePortada && !open
          ? "bottom-10 left-1/2 max-w-none -translate-x-1/2 max-sm:bottom-14 sm:bottom-8"
          : "bottom-10 left-4 sm:bottom-8 sm:left-10"
      }`}
    >
      {!open ? (
        <button
          type="button"
          className={`pointer-events-auto relative z-[90] order-1 group flex flex-col items-center gap-3 rounded-2xl border-0 bg-transparent p-0 outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70 ${
            isHomePortada
              ? "fixed left-1/2 top-[56%] -translate-x-1/2 -translate-y-1/2 max-sm:top-[58%]"
              : ""
          }`}
          onClick={() => setOpen(true)}
          aria-label={
            captureMicActive
              ? "Suelta Espacio o el micrófono para enviar a Onni"
              : wakeListening || nativeWakeListening
              ? "Onni escuchando. Di Hola Onni y tu pedido"
              : "Abrir Onni, asistente de voz y texto"
          }
        >
          <OnniAvatarDots
            size={isHomePortada ? "hero" : "lg"}
            state={avatarState}
            className={isHomePortada ? "max-sm:h-[200px] max-sm:w-[200px]" : undefined}
          />
        </button>
      ) : (
        <div className="pointer-events-auto rounded-2xl border border-cyan-300/35 bg-card/90 backdrop-blur-xl shadow-[0_0_45px_-16px_rgba(34,211,238,0.8)]">
          <div className="flex items-start gap-3 border-b border-white/10 px-3 py-3">
            <OnniAvatarDots size="md" state={avatarState} className="mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-cyan-100">Onni</p>
            </div>
            <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
              Cerrar
            </Button>
          </div>
          <div className="h-52 space-y-2 overflow-y-auto px-3 py-2">
            {messages.map((m, idx) => (
              <div key={idx} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[86%] whitespace-pre-wrap rounded-xl px-2.5 py-1.5 text-xs ${
                    m.role === "user" ? "bg-cyan-500/25 text-cyan-50" : "bg-white/10 text-foreground"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            <p className="text-[11px] text-muted-foreground">{hint}</p>
            {usesOneShotNativeMic && captureMicActive && (
              <p className="text-[10px] font-medium text-emerald-300/90">
                Escuchando… di tu pedido completo.
              </p>
            )}
            {usesContinuousMic && captureMicActive && (
              <p className="text-[10px] font-medium text-emerald-300/90">
                Micrófono activo — habla cuando quieras. Pulsa el micrófono otra vez para apagar.
              </p>
            )}
            {showAzureMic && androidMicState.isRecording && (
              <p className="text-[10px] font-medium text-emerald-300/90">
                Grabando… di «Hola Onni, llévame a…» y pulsa el mic otra vez.
              </p>
            )}
            {showAzureMic && androidMicState.isProcessing && (
              <p className="text-[10px] font-medium text-emerald-300/90">Transcribiendo con Azure…</p>
            )}
            {showElectronMic && electronMicState.isRecording && (
              <p className="text-[10px] font-medium text-emerald-300/90">
                Grabando… mantén pulsado el micrófono y di tu pedido.
              </p>
            )}
            {showElectronMic && electronMicState.isProcessing && (
              <p className="text-[10px] font-medium text-emerald-300/90">Transcribiendo con Azure…</p>
            )}
            {showChromeWebPushToTalk && captureMicActive && (
              <p className="text-[10px] font-medium text-emerald-300/90">
                Grabando… mantén pulsado el micrófono o Espacio y di tu pedido.
              </p>
            )}
            {wakeWordActive && wakeListening && !captureMicActive && (
              <p className="text-[10px] font-medium text-emerald-300/90">
                Onni te escucha — di «Hola Onni» o «Onni…» + tu pedido.
              </p>
            )}
            {supportsNativeWakeSwitch &&
              nativeWakeListening &&
              !captureMicActive &&
              !isOnniAndroidVoice() &&
              !isDesktopWebBrowser() && (
              <p className="text-[10px] font-medium text-emerald-300/90">
                {isElectronDesktopApp()
                  ? electronFollowUpActive
                    ? "Te escucho — di tu pedido (sin repetir «Hola Onni»)."
                    : "Di «Hola Onni, llévame a…» en una frase, o solo «Hola Onni» y luego tu pedido."
                  : "Onni te escucha — di «Hola Onni» o «Onni…» + tu pedido."}
              </p>
            )}
          </div>
          <form onSubmit={onSend} className="flex items-center gap-2 border-t border-white/10 p-3">
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="pregunta a Onni o pide ayuda"
            />
            {(canSpeak || canListen || showAzureMic || showElectronMic) && (
              <>
                {canSpeak && (
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    onClick={onSpeakLastAnswer}
                    aria-label="Escuchar la última respuesta de Onni"
                  >
                    <Volume2 className="h-4 w-4" />
                  </Button>
                )}
                {showAzureMic && (
                  <OpAiAndroidAzureMic
                    callbacks={azureMicCallbacks}
                    processing={processing}
                    panelOpen={open}
                    onStateChange={setAndroidMicState}
                  />
                )}
                {showElectronMic && (
                  <OpAiElectronAzureMic
                    processing={processing}
                    isRecording={electronMicRecording}
                    isProcessing={electronMicProcessing}
                    beginHold={electronMicBeginHold}
                    endHold={electronMicEndHold}
                  />
                )}
                {canListen && (
                  <Button
                    type="button"
                    size="icon"
                    variant={captureMicActive ? "secondary" : "outline"}
                    onClick={
                      usesOneShotNativeMic
                        ? () => void handleToggleVoiceCapture()
                        : usesContinuousMic
                          ? () => void handleToggleVoiceCapture()
                          : undefined
                    }
                    onPointerDown={
                      usesOneShotNativeMic || usesContinuousMic
                        ? undefined
                        : (event) => {
                            event.preventDefault();
                            handleStartVoiceCapture();
                          }
                    }
                    onPointerUp={
                      usesOneShotNativeMic || usesContinuousMic
                        ? undefined
                        : (event) => {
                            event.preventDefault();
                            stopVoiceCaptureHandler();
                          }
                    }
                    onPointerCancel={
                      usesOneShotNativeMic || usesContinuousMic
                        ? undefined
                        : (event) => {
                            event.preventDefault();
                            stopVoiceCaptureHandler();
                          }
                    }
                    onPointerLeave={
                      usesOneShotNativeMic || usesContinuousMic
                        ? undefined
                        : (event) => {
                            if (!captureMicActive) return;
                            event.preventDefault();
                            stopVoiceCaptureHandler();
                          }
                    }
                    onContextMenu={(event) => event.preventDefault()}
                    aria-label={
                      captureMicActive
                        ? usesOneShotNativeMic
                          ? "Detener micrófono de Onni"
                          : usesContinuousMic
                            ? "Detener micrófono de Onni"
                            : "Soltar micrófono de Onni"
                        : usesOneShotNativeMic
                          ? "Pulsa y di tu pedido a Onni"
                          : usesContinuousMic
                            ? "Activar micrófono de Onni (escucha continua)"
                            : "Mantener pulsado para hablar con Onni"
                    }
                  >
                    {captureMicActive ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  </Button>
                )}
              </>
            )}
            <Button type="submit" size="icon" variant="hero" aria-label="Enviar" disabled={processing}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
