const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("onniDesktop", {
  platform: process.platform,
  runtime: "electron",
});
