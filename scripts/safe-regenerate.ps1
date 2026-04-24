# Safe Regenerate Script - Windows PowerShell
# Faz backup do banco, para processos, regenera Prisma e reinicia

# Set UTF-8 encoding
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "RegCheck - Safe Regenerate" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# 1. Fazer backup do banco de dados
Write-Host "[1/5] Criando backup do banco de dados..." -ForegroundColor Yellow
try {
    pnpm run db:export 2>$null
    Write-Host "[OK] Backup criado com sucesso!" -ForegroundColor Green
} catch {
    Write-Host "[AVISO] Nao foi possivel criar backup (banco pode nao estar rodando)" -ForegroundColor Yellow
}
Write-Host ""

# 2. Parar todos os processos Node.js
Write-Host "[2/5] Parando processos Node.js..." -ForegroundColor Yellow
try {
    $nodeProcesses = Get-Process node -ErrorAction SilentlyContinue
    if ($nodeProcesses) {
        $nodeProcesses | Stop-Process -Force
        Write-Host "[OK] Processos Node.js parados!" -ForegroundColor Green
    } else {
        Write-Host "[INFO] Nenhum processo Node.js rodando" -ForegroundColor Gray
    }
} catch {
    Write-Host "[INFO] Nenhum processo Node.js para parar" -ForegroundColor Gray
}
Write-Host ""

# 3. Limpar cache do Prisma
Write-Host "[3/5] Limpando cache do Prisma..." -ForegroundColor Yellow
try {
    if (Test-Path "node_modules\.pnpm\@prisma+client@5.22.0_prisma@5.22.0\node_modules\.prisma") {
        Remove-Item -Recurse -Force "node_modules\.pnpm\@prisma+client@5.22.0_prisma@5.22.0\node_modules\.prisma"
        Write-Host "[OK] Cache do Prisma limpo!" -ForegroundColor Green
    } else {
        Write-Host "[INFO] Cache do Prisma ja esta limpo" -ForegroundColor Gray
    }
} catch {
    Write-Host "[AVISO] Nao foi possivel limpar cache do Prisma" -ForegroundColor Yellow
}
Write-Host ""

# 4. Regenerar Prisma Client
Write-Host "[4/5] Regenerando Prisma Client..." -ForegroundColor Yellow
try {
    pnpm run db:generate
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Prisma Client regenerado com sucesso!" -ForegroundColor Green
    } else {
        throw "Erro ao regenerar Prisma Client"
    }
} catch {
    Write-Host "[ERRO] Erro ao regenerar Prisma Client" -ForegroundColor Red
    exit 1
}
Write-Host ""

# 5. Perguntar se quer reiniciar a aplicação
Write-Host "[5/5] Reiniciar aplicacao?" -ForegroundColor Yellow
$restart = Read-Host "Deseja iniciar a aplicacao agora? (S/n)"

if ($restart -eq "" -or $restart -eq "S" -or $restart -eq "s") {
    Write-Host ""
    Write-Host "Iniciando aplicacao..." -ForegroundColor Green
    Write-Host ""
    pnpm dev
} else {
    Write-Host ""
    Write-Host "[OK] Regeneracao concluida!" -ForegroundColor Green
    Write-Host "Para iniciar a aplicacao, execute: pnpm dev" -ForegroundColor Cyan
}
