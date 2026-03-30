# Limpa node_modules de todos os workspaces e reinstala
# Necessario ao trocar entre Linux e Windows (binarios nativos sao platform-specific)

$dirs = @(
    "node_modules",
    "apps\api\node_modules",
    "apps\web\node_modules",
    "packages\database\node_modules",
    "packages\pdf-engine\node_modules",
    "packages\editor-engine\node_modules",
    "packages\shared\node_modules",
    "packages\validators\node_modules",
    "packages\ui\node_modules"
)

Write-Host "Limpando node_modules..."
foreach ($dir in $dirs) {
    if (Test-Path $dir) {
        Write-Host "  Removendo $dir"
        cmd /c "rmdir /s /q $dir"
    }
}

Write-Host "Reinstalando dependencias..."
pnpm install

Write-Host "Gerando Prisma Client..."
pnpm db:generate

Write-Host "Pronto!"
