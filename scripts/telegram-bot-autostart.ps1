# Arranca Onni Telegram + Ollama al iniciar Windows (desde carpeta Inicio).
$ErrorActionPreference = "Continue"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

$logDir = Join-Path $env:LOCALAPPDATA "OnniTelegramBot"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$logFile = Join-Path $logDir "bot.log"

function Write-Log($msg) {
  $line = "[{0}] {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $msg
  Add-Content -Path $logFile -Value $line
}

Write-Log "Iniciando Onni Telegram + Ollama..."

# Espera a que Ollama esté listo (la app suele arrancar un poco después del login).
$ollamaReady = $false
for ($i = 0; $i -lt 45; $i++) {
  try {
    $r = Invoke-WebRequest -Uri "http://127.0.0.1:11434/api/tags" -UseBasicParsing -TimeoutSec 3
    if ($r.StatusCode -eq 200) {
      $ollamaReady = $true
      break
    }
  } catch {
    Start-Sleep -Seconds 2
  }
}

if (-not $ollamaReady) {
  Write-Log "Ollama no respondió en 90s. Abre la app Ollama y reinicia el acceso directo OnniTelegramBot."
  exit 1
}

Write-Log "Ollama OK. Lanzando bot..."
$node = (Get-Command node -ErrorAction SilentlyContinue)?.Source
if (-not $node) {
  Write-Log "No se encontró node.exe en PATH."
  exit 1
}

& $node "$Root\scripts\telegram-ollama-bot.mjs" 2>&1 | ForEach-Object { Write-Log $_ }
