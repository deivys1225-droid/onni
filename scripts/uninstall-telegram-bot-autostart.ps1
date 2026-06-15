$startup = [Environment]::GetFolderPath("Startup")
$shortcutPath = Join-Path $startup "OnniTelegramBot.lnk"

if (Test-Path $shortcutPath) {
  Remove-Item $shortcutPath -Force
  Write-Host "Quitado de Inicio de Windows: OnniTelegramBot.lnk"
} else {
  Write-Host "No había acceso directo en Inicio."
}
