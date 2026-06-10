# Genera OnniVers.exe para Windows (instalador + portable) con icono OnniVers.
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot + "\.."
$env:CSC_IDENTITY_AUTO_DISCOVERY = "false"
npm run desktop:build
Write-Host ""
Write-Host "Listo. Archivos en release\:" -ForegroundColor Green
Get-ChildItem release -Filter "OnniVers*.exe" | ForEach-Object { Write-Host "  $($_.FullName)" }
