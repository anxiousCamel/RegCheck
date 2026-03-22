# -------------------------------------------------------
# RegCheck - One-click Dev Environment (PowerShell)
# Double-click or run: .\scripts\dev-start.ps1
# -------------------------------------------------------

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  RegCheck - Startup" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Check if WSL is available
if (-not (Get-Command wsl -ErrorAction SilentlyContinue)) {
    Write-Host "ERRO: WSL nao encontrado. Instale com: wsl --install" -ForegroundColor Red
    Read-Host "Pressione Enter para sair"
    exit 1
}

# Find the project path inside WSL
# Try common locations
$wslProjectPath = wsl bash -c "if [ -d ~/RegCheck ]; then echo ~/RegCheck; elif [ -d /home/user/RegCheck ]; then echo /home/user/RegCheck; fi" 2>$null

if ([string]::IsNullOrWhiteSpace($wslProjectPath)) {
    Write-Host "ERRO: Projeto RegCheck nao encontrado no WSL." -ForegroundColor Red
    Write-Host "Verifique se o projeto esta em ~/RegCheck dentro do WSL." -ForegroundColor Yellow
    Read-Host "Pressione Enter para sair"
    exit 1
}

$wslProjectPath = $wslProjectPath.Trim()
Write-Host "Projeto encontrado: $wslProjectPath" -ForegroundColor Green
Write-Host ""

# Ensure Docker Desktop is running (or dockerd inside WSL)
Write-Host "Verificando Docker..." -ForegroundColor Yellow
$dockerCheck = wsl bash -c "docker info > /dev/null 2>&1 && echo ok || echo fail" 2>$null

if ($dockerCheck.Trim() -ne "ok") {
    Write-Host "Iniciando Docker Desktop..." -ForegroundColor Yellow
    # Try starting Docker Desktop on Windows
    $dockerDesktop = "$env:ProgramFiles\Docker\Docker\Docker Desktop.exe"
    if (Test-Path $dockerDesktop) {
        Start-Process $dockerDesktop
        Write-Host "Aguardando Docker iniciar (pode levar ~30s)..." -ForegroundColor Yellow
        for ($i = 0; $i -lt 60; $i++) {
            Start-Sleep -Seconds 2
            $check = wsl bash -c "docker info > /dev/null 2>&1 && echo ok || echo fail" 2>$null
            if ($check.Trim() -eq "ok") {
                Write-Host "Docker pronto!" -ForegroundColor Green
                break
            }
            if ($i -eq 59) {
                Write-Host "AVISO: Docker demorou para iniciar. Tentando continuar..." -ForegroundColor Red
            }
        }
    } else {
        Write-Host "AVISO: Docker Desktop nao encontrado em $dockerDesktop" -ForegroundColor Red
        Write-Host "Inicie o Docker manualmente e tente novamente." -ForegroundColor Yellow
        Read-Host "Pressione Enter para sair"
        exit 1
    }
}

Write-Host ""
Write-Host "Iniciando ambiente de desenvolvimento..." -ForegroundColor Green
Write-Host "Os servicos vao rodar no terminal do WSL." -ForegroundColor Yellow
Write-Host ""
Write-Host "Endpoints:" -ForegroundColor Cyan
Write-Host "  Frontend      → http://localhost:3000" -ForegroundColor White
Write-Host "  API           → http://localhost:4000" -ForegroundColor White
Write-Host "  Prisma Studio → http://localhost:5555" -ForegroundColor White
Write-Host "  MinIO Console → http://localhost:9001" -ForegroundColor White
Write-Host ""

# Run the bash script inside WSL
wsl bash -c "cd $wslProjectPath && bash scripts/dev-start.sh"
