# Limpa node_modules de todos os workspaces e reinstala
# Necessário ao trocar entre Linux e Windows (binários nativos são platform-specific)

Write-Host "🧹 Limpando node_modules..."
Get-ChildItem -Path . -Filter "node_modules" -Recurse -Directory -Force |
  Where-Object { $_.FullName -notmatch '\.git' } |
  ForEach-Object { Remove-Item -Recurse -Force $_.FullName }

Write-Host "📦 Reinstalando dependências..."
pnpm install

Write-Host "✅ Pronto!"
