import { isMobileUserAgent } from "@/lib/deviceDetection";

declare global {
  interface Window {
    onniversDesktop?: { platform?: string; version?: string };
  }
}

export function isOnniversDesktopApp(): boolean {
  return typeof window !== "undefined" && Boolean(window.onniversDesktop);
}

export function buildCameraVideoConstraints(): MediaTrackConstraints {
  if (typeof window === "undefined") {
    return { width: { ideal: 1280 }, height: { ideal: 720 } };
  }

  const cap = Math.min(window.devicePixelRatio || 1, 2);
  const idealWidth = Math.min(Math.round(window.innerWidth * cap), 1920);
  const idealHeight = Math.min(Math.round(window.innerHeight * cap), 1080);

  if (isMobileUserAgent()) {
    return {
      facingMode: { ideal: "environment" },
      width: { ideal: idealWidth, max: 1920 },
      height: { ideal: idealHeight, max: 1080 },
    };
  }

  return {
    width: { ideal: idealWidth, max: 1920 },
    height: { ideal: idealHeight, max: 1080 },
    frameRate: { ideal: 30, max: 30 },
  };
}

export function isCameraStreamLive(stream: MediaStream | null | undefined): boolean {
  if (!stream) return false;
  const track = stream.getVideoTracks()[0];
  return Boolean(track && track.readyState === "live" && track.enabled);
}

export async function openCameraStream(): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Este dispositivo no soporta camara web.");
  }

  const constraints = buildCameraVideoConstraints();
  try {
    return await navigator.mediaDevices.getUserMedia({ video: constraints, audio: false });
  } catch {
    return await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
  }
}

/** Enlaza stream al video y espera reproduccion (Electron a veces no dispara loadeddata en 1x1). */
export async function attachCameraStreamToVideo(
  video: HTMLVideoElement,
  stream: MediaStream,
): Promise<void> {
  video.srcObject = stream;
  video.muted = true;
  video.playsInline = true;
  video.autoplay = true;

  await video.play().catch(() => undefined);

  if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) return;

  await new Promise<void>((resolve) => {
    const finish = () => {
      cleanup();
      resolve();
    };
    const cleanup = () => {
      video.removeEventListener("loadedmetadata", finish);
      video.removeEventListener("loadeddata", finish);
      video.removeEventListener("canplay", finish);
      video.removeEventListener("playing", finish);
      window.clearTimeout(timeoutId);
    };

    video.addEventListener("loadedmetadata", finish, { once: true });
    video.addEventListener("loadeddata", finish, { once: true });
    video.addEventListener("canplay", finish, { once: true });
    video.addEventListener("playing", finish, { once: true });

    const timeoutId = window.setTimeout(finish, isOnniversDesktopApp() ? 2500 : 1200);
  });
}
