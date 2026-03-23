#!/bin/bash
# Coach Keith AI — Development Startup Script
#
# Usage: ./scripts/start-dev.sh
#
# Starts:
#   1. Docker containers (pgvector, Firestore emulator, GCS emulator)
#   2. Pi-Brain database migrations
#   3. API server on port 3001
#   4. Web app on port 3002

set -e
cd "$(dirname "$0")/.."

echo "🎯 Coach Keith AI — Starting Development Environment"
echo ""

# 1. Start Docker containers
echo "📦 Starting Docker containers..."
docker compose up -d
sleep 3

# 2. Check pgvector is ready
echo "🔍 Waiting for PostgreSQL..."
until docker exec coach-keith-db pg_isready -U navigator -d coach_keith_brain 2>/dev/null; do
  sleep 1
done
echo "✅ PostgreSQL ready"

# 3. Enable pgvector extension
docker exec coach-keith-db psql -U navigator -d coach_keith_brain -c "CREATE EXTENSION IF NOT EXISTS vector;" 2>/dev/null

# 4. Run Pi-Brain migrations
echo "🧠 Running Pi-Brain migrations..."
DATABASE_URL="postgresql://navigator:navigator@localhost:5433/coach_keith_brain" \
MEMORY_NAMESPACE="coach-keith" \
npx -y mcp-brain@latest migrate 2>/dev/null
echo "✅ Migrations complete"

# 5. Check if content needs ingesting
NODE_COUNT=$(DATABASE_URL="postgresql://navigator:navigator@localhost:5433/coach_keith_brain" \
  MEMORY_NAMESPACE="coach-keith" \
  npx -y mcp-brain@latest stats coach-keith 2>/dev/null | grep "Nodes:" | awk '{print $2}')

if [ "$NODE_COUNT" = "0" ]; then
  echo "📚 Ingesting Keith's coaching content (first time only)..."
  node scripts/ingest-content.js
  echo "✅ Content ingested"
else
  echo "✅ Keith's content already loaded ($NODE_COUNT nodes)"
fi

# 6. Build and start API
echo "🚀 Building API..."
cd apps/api
npx nest build 2>/dev/null
echo "✅ API built"

echo ""
echo "============================================"
echo "  Coach Keith AI is ready!"
echo ""
echo "  API:  http://localhost:3001"
echo "  Docs: http://localhost:3001/api/docs"
echo "  Web:  http://localhost:3002"
echo ""
echo "  Start API:  cd apps/api && PI_BRAIN_DATABASE_URL=postgresql://navigator:navigator@localhost:5433/coach_keith_brain node dist/main.js"
echo "  Start Web:  cd apps/web && npx next dev -p 3002"
echo "============================================"
