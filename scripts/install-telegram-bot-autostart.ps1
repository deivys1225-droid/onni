# Instala Onni Telegram + Ollama en Inicio de Windows.
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$startup = [Environment]::GetFolderPath("Startup")
$shortcutPath = Join-Path $startup "OnniTelegramBot.lnk"
$runner = Join-Path $Root "scripts\telegram-bot-autostart.ps1"

if (-not (Test-Path $runner)) {
  Write-Error "No se encontró $runner"
  exit 1
}

$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut($shortcutPath)
$Shortcut.TargetPath = "powershell.exe"
$Shortcut.Arguments = "-WindowStyle Minimized -NoProfile -ExecutionPolicy Bypass -File `"$runner`""
$Shortcut.WorkingDirectory = $Root
$Shortcut.Description = "Onni Telegram con Ollama (gemma3:1b)"
$Shortcut.Save()

Write-Host "Listo. Acceso directo creado en Inicio de Windows:"
Write-Host "  $shortcutPath"
Write-Host ""
Write-Host "Al iniciar sesión se abrirá una ventana minimizada con el bot."
Write-Host "Log: $env:LOCALAPPDATA\OnniTelegramBot\bot.log"
Write-Host ""
Write-Host "Para quitar: npm run telegram:bot:uninstall"
