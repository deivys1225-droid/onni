import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const project = path.join(root, "electron", "onni-win-speech", "OnniWinSpeech.csproj");
const output = path.join(root, "electron", "onni-win-speech", "publish");

function findDotnet() {
  const candidates = [
    process.env.DOTNET_ROOT ? path.join(process.env.DOTNET_ROOT, "dotnet.exe") : "",
    "C:\\Program Files\\dotnet\\dotnet.exe",
    "dotnet",
  ].filter(Boolean);

  for (const candidate of candidates) {
    const result = spawnSync(candidate, ["--version"], { encoding: "utf8" });
    if (result.status === 0) return candidate;
  }
  return null;
}

const dotnet = findDotnet();
const publishedExe = path.join(output, "onni-win-speech.exe");

if (!dotnet) {
  if (fs.existsSync(publishedExe)) {
    console.log("[onni-win-speech] Usando ejecutable existente en publish/.");
    process.exit(0);
  }
  console.error(
    "[onni-win-speech] .NET SDK no encontrado. Instala .NET 8 SDK: winget install Microsoft.DotNet.SDK.8",
  );
  process.exit(1);
}

fs.mkdirSync(output, { recursive: true });
const publish = spawnSync(
  dotnet,
  ["publish", project, "-c", "Release", "-r", "win-x64", "--self-contained", "false", "-o", output],
  { stdio: "inherit" },
);

process.exit(publish.status ?? 1);
