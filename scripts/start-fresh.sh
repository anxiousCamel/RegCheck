#!/bin/bash
# Script para limpar portas e iniciar o RegCheck no Linux/macOS (PROTEGIDO)
PORTS=(3000 4000 5432 6379 9000 9001 5555)
IGNORE_NAMES=("docker" "com.docker" "wslrelay")

echo -e "\n\033[0;36m===================================================="
echo "   REGCHECK - START FRESH (LINUX/MACOS)"
echo -e "====================================================\033[0m\n"

echo -e "\033[0;33m[1/4] Parando containers Docker primeiro (infra:down)...\033[0m"
pnpm infra:down 2>/dev/null

echo -e "\n\033[0;33m[2/4] Identificando processos ZOMBIES (Node.js/Outros)...\033[0m"

for port in "${PORTS[@]}"; do
    pid=$(lsof -t -i:$port)
    if [ ! -z "$pid" ]; then
        # Pega o nome do processo
        proc_name=$(ps -p $pid -o comm=)
        
        should_kill=true
        for ignore in "${IGNORE_NAMES[@]}"; do
            if [[ "$proc_name" == *"$ignore"* ]]; then
                should_kill=false
                break
            fi
        done

        if [ "$should_kill" = true ]; then
            echo -e "  -> Porta $port ocupada por: $proc_name (PID: $pid)"
            echo -e "     \033[0;31mMatando processo $pid...\033[0m"
            kill -9 $pid 2>/dev/null
        else
            echo -e "  -> Porta $port ocupada por DOCKER ($proc_name). Ignorando."
        fi
    else
        echo -e "  -> Porta $port esta livre."
    fi
done

echo -e "\n\033[0;33m[3/4] Iniciando a aplicacao completa (up:studio)...\033[0m"
echo -e "\033[0;36mAguarde o carregamento dos logs...\033[0m\n"

pnpm run up:studio
