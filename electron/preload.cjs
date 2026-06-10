const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("onniDesktop", {
  platform: process.platform,
  runtime: "electron",
  runAction: (action) => ipcRenderer.invoke("onni:desktopAction", action),
});
