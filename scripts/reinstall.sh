#!/bin/bash
# Limpa node_modules de todos os workspaces e reinstala
# Necessário ao trocar entre Linux e Windows (binários nativos são platform-specific)

echo "🧹 Limpando node_modules..."
find . -name "node_modules" -not -path "*/.git/*" -prune -exec rm -rf {} + 2>/dev/null
echo "📦 Reinstalando dependências..."
pnpm install
echo "✅ Pronto!"
