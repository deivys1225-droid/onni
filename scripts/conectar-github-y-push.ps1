# Ejecuta ESTO en PowerShell (doble clic o terminal).
# Usa la cuenta de la ORGANIZACION (empresatecnologicadecolombia-glitch), NO la personal.

$ErrorActionPreference = "Continue"
Set-Location "z:\pagina web onniverso"
$env:Path = "C:\Program Files\Git\bin;C:\Program Files\nodejs;" + $env:Path

Write-Host ""
Write-Host "=== 1) Login GitHub (se abre el navegador) ===" -ForegroundColor Cyan
Write-Host "    Elige la cuenta: empresatecnologicadecolombia-glitch" -ForegroundColor Yellow
Write-Host ""
git credential-manager github login

Write-Host ""
Write-Host "=== 2) Subir a GitHub ===" -ForegroundColor Cyan
git push origin main

if ($LASTEXITCODE -eq 0) {
  Write-Host ""
  Write-Host "LISTO. Vercel despliega solo en 1-3 min -> https://onnivers.com" -ForegroundColor Green
} else {
  Write-Host ""
  Write-Host "Si falla, usa GitHub Desktop con la cuenta correcta y Push origin." -ForegroundColor Red
}
Write-Host ""
pause
