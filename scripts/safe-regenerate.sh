#!/bin/bash
# Safe Regenerate Script - Linux/Mac Bash
# Faz backup do banco, para processos, regenera Prisma e reinicia

echo -e "\033[36m🔄 RegCheck - Safe Regenerate\033[0m"
echo -e "\033[36m================================\033[0m"
echo ""

# 1. Fazer backup do banco de dados
echo -e "\033[33m📦 Passo 1/5: Criando backup do banco de dados...\033[0m"
if pnpm run db:export 2>/dev/null; then
    echo -e "\033[32m✅ Backup criado com sucesso!\033[0m"
else
    echo -e "\033[33m⚠️  Aviso: Não foi possível criar backup (banco pode não estar rodando)\033[0m"
fi
echo ""

# 2. Parar todos os processos Node.js
echo -e "\033[33m🛑 Passo 2/5: Parando processos Node.js...\033[0m"
if pkill -f node 2>/dev/null; then
    echo -e "\033[32m✅ Processos Node.js parados!\033[0m"
else
    echo -e "\033[90mℹ️  Nenhum processo Node.js rodando\033[0m"
fi
echo ""

# 3. Limpar cache do Prisma
echo -e "\033[33m🧹 Passo 3/5: Limpando cache do Prisma...\033[0m"
if [ -d "node_modules/.pnpm/@prisma+client@5.22.0_prisma@5.22.0/node_modules/.prisma" ]; then
    rm -rf "node_modules/.pnpm/@prisma+client@5.22.0_prisma@5.22.0/node_modules/.prisma"
    echo -e "\033[32m✅ Cache do Prisma limpo!\033[0m"
else
    echo -e "\033[90mℹ️  Cache do Prisma já está limpo\033[0m"
fi
echo ""

# 4. Regenerar Prisma Client
echo -e "\033[33m⚙️  Passo 4/5: Regenerando Prisma Client...\033[0m"
if pnpm run db:generate; then
    echo -e "\033[32m✅ Prisma Client regenerado com sucesso!\033[0m"
else
    echo -e "\033[31m❌ Erro ao regenerar Prisma Client\033[0m"
    exit 1
fi
echo ""

# 5. Perguntar se quer reiniciar a aplicação
echo -e "\033[33m🚀 Passo 5/5: Reiniciar aplicação?\033[0m"
read -p "Deseja iniciar a aplicação agora? (S/n) " restart

if [ -z "$restart" ] || [ "$restart" = "S" ] || [ "$restart" = "s" ]; then
    echo ""
    echo -e "\033[32m🎉 Iniciando aplicação...\033[0m"
    echo ""
    pnpm dev
else
    echo ""
    echo -e "\033[32m✅ Regeneração concluída!\033[0m"
    echo -e "\033[36mPara iniciar a aplicação, execute: pnpm dev\033[0m"
fi
