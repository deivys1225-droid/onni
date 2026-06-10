# Cambia la sesion de GitHub en este PC y sube el commit pendiente a origin/main.
# Ejecutar: clic derecho -> Ejecutar con PowerShell
# O en terminal: powershell -ExecutionPolicy Bypass -File .\scripts\cambiar-cuenta-github-y-push.ps1

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

$git = "C:\Program Files\Git\bin\git.exe"
if (-not (Test-Path $git)) {
  Write-Host "Instala Git: https://git-scm.com/download/win" -ForegroundColor Red
  exit 1
}
$env:Path = "C:\Program Files\Git\bin;C:\Program Files\nodejs;" + $env:Path

Write-Host ""
Write-Host "=== OnniVerso - cambiar cuenta GitHub y push ===" -ForegroundColor Cyan
Write-Host ""

# 1) Quitar credenciales HTTPS viejas (ej. deivys1224-ctrl)
Write-Host "[1/4] Cerrando sesion GitHub en Git Credential Manager..." -ForegroundColor Yellow
git credential-manager github logout deivys1224-ctrl 2>$null
git credential-manager github logout empresatecnologicadecolombia-glitch 2>$null
"protocol=https`nhost=github.com`n" | git credential-manager erase 2>$null

# Administrador de credenciales de Windows (GitHub Desktop / GCM)
$credTarget = 'LegacyGeneric:target=GitHub - https://api.github.com/empresatecnologicadecolombia-glitch'
cmd.exe /c "cmdkey /delete:`"$credTarget`"" 2>$null | Out-Null
Write-Host "      Si sigue fallando: Panel de control -> Administrador de credenciales de Windows" -ForegroundColor Gray
Write-Host "      -> Credenciales de Windows -> elimina entradas de 'github' o 'git'" -ForegroundColor Gray

# 2) Usuario del repo (organizacion)
Write-Host "[2/4] Configurando identidad local del repo..." -ForegroundColor Yellow
git config --local user.name "empresatecnologicadecolombia-glitch"
git config --local user.email "empresatecnologicadecolombia@gmail.com"

# 3) Login — se abre el navegador; entra con la cuenta que puede escribir en el repo
Write-Host "[3/4] Abriendo login de GitHub (elige la cuenta de la organizacion)..." -ForegroundColor Yellow
Write-Host "      Si no se abre solo, copia este comando en otra terminal:" -ForegroundColor Gray
Write-Host "      git credential-manager github login" -ForegroundColor Gray
git credential-manager github login

# 4) Push
Write-Host "[4/4] Subiendo a GitHub (Vercel desplegara solo)..." -ForegroundColor Yellow
git push origin main

if ($LASTEXITCODE -eq 0) {
  Write-Host ""
  Write-Host "Listo. Revisa el deploy en https://vercel.com" -ForegroundColor Green
} else {
  Write-Host ""
  Write-Host "Push fallo. Usa GitHub Desktop: File -> Add local repository -> Push origin" -ForegroundColor Yellow
}

Write-Host ""
