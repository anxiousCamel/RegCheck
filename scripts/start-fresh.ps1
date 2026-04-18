# Script para limpar portas e iniciar o RegCheck no Windows (PROTEGIDO)
$ports = @(3000, 4000, 5432, 6379, 9000, 9001, 5555)
$processesToIgnore = @("com.docker.backend", "wslrelay", "docker", "Docker Desktop")

Write-Host "`n====================================================" -ForegroundColor Cyan
Write-Host "   REGCHECK - START FRESH (WINDOWS)" -ForegroundColor Cyan
Write-Host "   (Protegendo processos do Docker)" -ForegroundColor Gray
Write-Host "====================================================`n" -ForegroundColor Cyan

Write-Host "[1/4] Parando containers Docker primeiro (infra:down)..." -ForegroundColor Yellow
# Tentamos baixar a infra primeiro de forma limpa
try {
    pnpm infra:down
} catch {
    Write-Host "  !! Aviso: Nao foi possivel rodar infra:down (Docker pode estar desligado)" -ForegroundColor Gray
}

Write-Host "`n[2/4] Identificando processos ZOMBIES (Node.js/Outros)..." -ForegroundColor Yellow

foreach ($port in $ports) {
    $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($connections) {
        $pids = $connections | Select-Object -ExpandProperty OwningProcess -Unique
        foreach ($p in $pids) {
            try {
                $proc = Get-Process -Id $p -ErrorAction SilentlyContinue
                if ($proc) {
                    $shouldKill = $true
                    foreach ($ignore in $processesToIgnore) {
                        if ($proc.Name -like "*$ignore*") {
                            $shouldKill = $false
                            break
                        }
                    }

                    if ($shouldKill) {
                        Write-Host "  -> Porta $port ocupada por: $($proc.Name) (PID: $p)" -ForegroundColor Gray
                        Write-Host "     Matando processo $p..." -ForegroundColor Red
                        Stop-Process -Id $p -Force -ErrorAction SilentlyContinue
                    } else {
                        Write-Host "  -> Porta $port ocupada por DOCKER ($($proc.Name)). Ignorando kill para nao derrubar o daemon." -ForegroundColor DarkCyan
                    }
                }
            } catch {
                Write-Host "  !! Erro ao analisar processo $p na porta $port" -ForegroundColor Red
            }
        }
    } else {
        Write-Host "  -> Porta $port esta livre." -ForegroundColor DarkGray
    }
}

Write-Host "`n[3/4] Iniciando a aplicacao completa (up:studio)..." -ForegroundColor Yellow
Write-Host "Aguarde o carregamento dos logs...`n" -ForegroundColor Cyan

pnpm run up:studio
