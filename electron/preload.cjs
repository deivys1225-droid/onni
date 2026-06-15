const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("onniDesktop", {
  platform: process.platform,
  runtime: "electron",
  runAction: (action) => ipcRenderer.invoke("onni:desktopAction", action),
});

contextBridge.exposeInMainWorld("onniversDesktop", {
  platform: process.platform,
  isDesktopApp: true,
  vosk: {
    isAvailable: async () => {
      const result = await ipcRenderer.invoke("onni:voskIsAvailable");
      return Boolean(result?.available);
    },
    transcribe: async (payload) => {
      const result = await ipcRenderer.invoke("onni:voskTranscribe", payload);
      if (!result?.ok) {
        throw new Error(String(result?.message || "No pude transcribir con Vosk."));
      }
      return { text: String(result.text || "") };
    },
  },
});
