# Reconectar este proyecto en un PC nuevo (copia desde otro equipo).
# Ejecutar:  powershell -ExecutionPolicy Bypass -File .\scripts\reconectar-en-este-pc.ps1

$ErrorActionPreference = "Continue"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

$git = "C:\Program Files\Git\bin\git.exe"
if (Test-Path $git) {
  $env:Path = "C:\Program Files\Git\bin;C:\Program Files\Git\cmd;" + $env:Path
}

Write-Host ""
Write-Host "=== OnniVerso - estado de conexiones ===" -ForegroundColor Cyan
Write-Host ""

# GitHub
if (Test-Path $git) {
  $remote = & $git remote get-url origin 2>$null
  $branch = & $git branch --show-current 2>$null
  Write-Host "[GitHub] Remote: $remote"
  Write-Host "[GitHub] Rama:   $branch"
  & $git fetch origin 2>$null | Out-Null
  if ($LASTEXITCODE -eq 0) {
    Write-Host "[GitHub] OK - conectado a origin" -ForegroundColor Green
  } else {
    Write-Host "[GitHub] Revisa login (GitHub Desktop o token)" -ForegroundColor Yellow
  }
} else {
  Write-Host "[GitHub] Instala Git: https://git-scm.com/download/win" -ForegroundColor Yellow
}
Write-Host ""

# Vercel
$vercelJson = Join-Path $Root ".vercel\project.json"
if (Test-Path $vercelJson) {
  $v = Get-Content $vercelJson | ConvertFrom-Json
  Write-Host "[Vercel] Proyecto local: $($v.projectName)"
  Write-Host "[Vercel] Produccion: GitHub + vercel.com (ya desplegado)" -ForegroundColor Green
} else {
  Write-Host "[Vercel] Falta .vercel - ejecuta: npx vercel link" -ForegroundColor Yellow
}
Write-Host ""

# Supabase
$linked = Join-Path $Root "supabase\.temp\linked-project.json"
if (Test-Path $linked) {
  $s = Get-Content $linked | ConvertFrom-Json
  Write-Host "[Supabase] Proyecto: $($s.ref)"
}
$sb = Join-Path $Root "node_modules\.bin\supabase.cmd"
if (Test-Path $sb) {
  $list = & $sb projects list 2>&1 | Out-String
  if ($list -match "Access token not provided") {
    Write-Host "[Supabase] En ESTE PC: node_modules\.bin\supabase.cmd login" -ForegroundColor Yellow
  } else {
    Write-Host "[Supabase] CLI autenticado en este PC" -ForegroundColor Green
  }
}
Write-Host ""

# .env
$envFile = Join-Path $Root ".env"
$envSize = if (Test-Path $envFile) { (Get-Item $envFile).Length } else { 0 }
if ($envSize -lt 10) {
  Write-Host "[.env] VACIO - copia el .env del PC viejo O:" -ForegroundColor Yellow
  Write-Host "       npx vercel login"
  Write-Host "       npx vercel env pull .env"
} else {
  Write-Host "[.env] OK - $envSize bytes" -ForegroundColor Green
}
Write-Host ""

Write-Host "=== Solo una vez en PC nuevo ===" -ForegroundColor Cyan
Write-Host "1. Copiar .env del PC anterior"
Write-Host "2. supabase login"
Write-Host "3. Instalar Node.js LTS (nodejs.org) y reiniciar Cursor"
Write-Host "4. npm run dev"
Write-Host ""
