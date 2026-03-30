#!/bin/bash
# Limpa node_modules de todos os workspaces e reinstala
# Necessario ao trocar entre Linux e Windows (binarios nativos sao platform-specific)

echo "Limpando node_modules..."
find . -name "node_modules" -not -path "*/.git/*" -prune -exec rm -rf {} + 2>/dev/null
echo "Reinstalando dependencias..."
pnpm install
echo "Gerando Prisma Client..."
pnpm db:generate
echo "Pronto!"
