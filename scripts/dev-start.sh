#!/usr/bin/env bash
# -------------------------------------------------------
# RegCheck - Dev Environment Startup (runs inside WSL)
# Usage: ./scripts/dev-start.sh
# -------------------------------------------------------
set -e

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

echo "========================================="
echo "  RegCheck - Iniciando ambiente de dev"
echo "========================================="

# 1. Start Docker containers (postgres, redis, minio)
echo ""
echo "[1/4] Subindo Docker (postgres, redis, minio)..."
docker compose up -d

# Wait for postgres to be ready
echo "  Aguardando PostgreSQL..."
for i in $(seq 1 30); do
  if docker compose exec -T postgres pg_isready -U regcheck > /dev/null 2>&1; then
    echo "  PostgreSQL pronto!"
    break
  fi
  sleep 1
  if [ "$i" -eq 30 ]; then
    echo "  AVISO: PostgreSQL demorou para iniciar, continuando mesmo assim..."
  fi
done

# 2. Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo ""
  echo "[2/4] Instalando dependencias..."
  pnpm install
else
  echo ""
  echo "[2/4] Dependencias OK (node_modules existe)"
fi

# 3. Push database schema
echo ""
echo "[3/4] Sincronizando schema do banco (db:push)..."
pnpm db:push

# 4. Start all services in parallel using background processes
echo ""
echo "[4/4] Iniciando servicos..."
echo "  - Frontend (Next.js)     → http://localhost:3000"
echo "  - API (Express)          → http://localhost:4000"
echo "  - Prisma Studio          → http://localhost:5555"
echo "  - MinIO Console          → http://localhost:9001"
echo ""

# Use a trap to kill all background processes on exit
cleanup() {
  echo ""
  echo "Encerrando servicos..."
  kill $(jobs -p) 2>/dev/null
  exit 0
}
trap cleanup SIGINT SIGTERM

# Start turbo dev (frontend + api) in background
pnpm dev &
DEV_PID=$!

# Start Prisma Studio in background
cd packages/database
pnpm db:studio &
STUDIO_PID=$!
cd "$PROJECT_DIR"

echo "========================================="
echo "  Tudo rodando! Ctrl+C para encerrar."
echo "========================================="

# Wait for any background process to exit
wait
