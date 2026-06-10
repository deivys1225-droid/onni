import fs from "node:fs";
import path from "node:path";
import { rcedit } from "rcedit";

const iconPath = path.resolve("electron/icons/icon.ico");
const mainExe = path.resolve("release/win-unpacked/OnniVers.exe");

if (!fs.existsSync(iconPath)) {
  console.error("Falta el icono. Ejecuta: npm run desktop:icon");
  process.exit(1);
}

if (!fs.existsSync(mainExe)) {
  console.error("Falta el ejecutable empaquetado. Ejecuta: npm run desktop:pack");
  process.exit(1);
}

/**
 * Solo parchear win-unpacked/OnniVers.exe.
 * NO tocar OnniVers-1.0.0.exe ni el Setup: son archivos NSIS comprimidos
 * y rcedit los rompe (quedan ~400 KB e inutilizables).
 */
await rcedit(mainExe, {
  icon: iconPath,
  "product-name": "OnniVers",
  "file-description": "OnniVers — Tu Realidad Evolucionada",
});

console.log("Icono OnniVers aplicado:", mainExe);
