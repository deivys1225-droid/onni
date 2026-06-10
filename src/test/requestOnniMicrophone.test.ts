import { afterEach, describe, expect, it, vi } from "vitest";
import { requestOnniMicrophoneAccess } from "@/lib/requestOnniMicrophone";

describe("requestOnniMicrophoneAccess", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete window.AndroidBridge;
  });

  it("usa AndroidBridge cuando existe", async () => {
    window.AndroidBridge = {
      requestOnniMicrophonePermission: (cb) => {
        const fn = (window as Window & Record<string, (g: boolean) => void>)[cb];
        fn?.(true);
      },
    };
    await expect(requestOnniMicrophoneAccess()).resolves.toBe("granted");
  });

  it("getUserMedia concedido en web", async () => {
    const stop = vi.fn();
    vi.stubGlobal("navigator", {
      mediaDevices: {
        getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [{ stop }] }),
      },
    });
    await expect(requestOnniMicrophoneAccess()).resolves.toBe("granted");
    expect(stop).toHaveBeenCalled();
  });

  it("Omite getUserMedia en OnniVers .exe con voz Windows (sin Whisper)", async () => {
    window.onniversDesktop = {
      isDesktopApp: true,
      voice: { startListening: vi.fn(), stopListening: vi.fn() },
    };
    const getUserMedia = vi.fn();
    vi.stubGlobal("navigator", { mediaDevices: { getUserMedia } });
    await expect(requestOnniMicrophoneAccess()).resolves.toBe("granted");
    expect(getUserMedia).not.toHaveBeenCalled();
    delete window.onniversDesktop;
  });

  it("Pide getUserMedia en OnniVers .exe con Whisper", async () => {
    window.onniversDesktop = {
      isDesktopApp: true,
      voice: { startListening: vi.fn(), stopListening: vi.fn() },
      whisper: { transcribe: vi.fn() },
    };
    const stop = vi.fn();
    const getUserMedia = vi.fn().mockResolvedValue({ getTracks: () => [{ stop }] });
    vi.stubGlobal("navigator", { mediaDevices: { getUserMedia } });
    await expect(requestOnniMicrophoneAccess()).resolves.toBe("granted");
    expect(getUserMedia).toHaveBeenCalled();
    delete window.onniversDesktop;
  });
});
