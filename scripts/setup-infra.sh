#!/usr/bin/env bash
set -euo pipefail

# ── Pabriq local infra setup ───────────────────────────────────────────────
# Spins up PostgreSQL 18 + pgvector + MinIO containers, creates dev/test
# databases (with vector extension) and the storage bucket, and optionally
# runs DB migrations.
#
# Usage:
#   bash scripts/setup-infra.sh              # full setup
#   bash scripts/setup-infra.sh --no-migrate  # skip migrations
#
# Requires: docker, docker compose
# ────────────────────────────────────────────────────────────────────────────

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

log()  { printf "${CYAN}==>${NC} %s\n" "$*"; }
ok()   { printf "${GREEN}  ✓${NC} %s\n" "$*"; }
warn() { printf "${YELLOW}  !${NC} %s\n" "$*"; }
err()  { printf "${RED}  ✗${NC} %s\n" "$*"; }

RUN_MIGRATIONS=true
while [[ $# -gt 0 ]]; do
  case "$1" in
    --no-migrate) RUN_MIGRATIONS=false; shift ;;
    --help|-h)
      echo "Usage: bash scripts/setup-infra.sh [--no-migrate]"
      exit 0
      ;;
    *) err "Unknown option: $1"; exit 1 ;;
  esac
done

# ── Prerequisites ───────────────────────────────────────────────────────────

log "Checking prerequisites..."

if ! command -v docker &>/dev/null; then
  err "docker is not installed or not in PATH"
  exit 1
fi
ok "docker found"

if ! docker compose version &>/dev/null; then
  err "docker compose is not available (need Docker Compose v2+)"
  exit 1
fi
ok "docker compose found"

# ── Start containers ────────────────────────────────────────────────────────

log "Starting containers..."

docker compose up -d --wait

ok "postgres (PG18 + pgvector) is ready"
ok "minio is ready"

# ── Create databases ────────────────────────────────────────────────────────

log "Creating databases..."

create_db() {
  local db_name="$1"
  docker compose exec -T postgres \
    psql -U postgres <<SQL &>/dev/null
SELECT 'CREATE DATABASE "${db_name}"'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${db_name}')
\gexec
SQL
  ok "database '${db_name}' ready"
}

create_db "pabriq-db-dev"
create_db "pabriq-db-test"

# ── Enable pgvector extension ───────────────────────────────────────────────

log "Enabling pgvector extension..."

enable_vector() {
  local db_name="$1"
  docker compose exec -T postgres \
    psql -U postgres -d "${db_name}" \
    -c "CREATE EXTENSION IF NOT EXISTS vector" \
    &>/dev/null
  ok "vector extension enabled on '${db_name}'"
}

enable_vector "pabriq-db-dev"
enable_vector "pabriq-db-test"

# ── Create MinIO bucket ─────────────────────────────────────────────────────

log "Creating MinIO bucket..."
BUCKET_NAME="pabriq-storage"


# Configure the mc client with local MinIO credentials
docker compose exec -T minio \
  mc alias set local http://localhost:9000 minioadmin minioadmin &>/dev/null

# Create the bucket (idempotent)
docker compose exec -T minio \
  mc mb "local/${BUCKET_NAME}" --ignore-existing &>/dev/null

# Set public read policy so presigned URLs work with local MinIO
docker compose exec -T minio \
  mc anonymous set download "local/${BUCKET_NAME}" &>/dev/null

ok "bucket '${BUCKET_NAME}' ready"

# ── Run migrations (optional) ───────────────────────────────────────────────

if $RUN_MIGRATIONS; then
  log "Running database migrations..."

  if ! command -v bun &>/dev/null; then
    warn "bun not found — skipping migrations"
    warn "Run 'bun run db:migrate' after installing dependencies."
  elif [[ ! -f "node_modules/.bin/drizzle-kit" ]]; then
    warn "dependencies not installed — skipping migrations"
    warn "Run 'bun install && bun run db:migrate' first."
  else
    DATABASE_URL="postgresql://postgres:postgres@localhost:55432/pabriq-db-dev" \
      bun run db:migrate
    ok "migrations complete"
  fi
fi

# ── Summary ─────────────────────────────────────────────────────────────────

echo ""
printf "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
printf "${GREEN}  Local infra is ready.${NC}\n"
printf "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
echo ""
echo "  Add these to your .env.local:"
echo ""
echo "  DATABASE_URL=\"postgresql://postgres:postgres@localhost:55432/pabriq-db-dev\""
echo ""
echo "  # MinIO (local R2 replacement)"
echo "  R2_ENDPOINT=\"http://localhost:9010\""
echo "  R2_ACCESS_KEY_ID=\"minioadmin\""
echo "  R2_SECRET_ACCESS_KEY=\"minioadmin\""
echo "  R2_BUCKET_NAME=\"${BUCKET_NAME}\""
echo "  R2_PUBLIC_URL=\"http://localhost:9010/${BUCKET_NAME}\""
echo ""
echo "  ── Useful commands ──"
echo ""
echo "  MinIO console:    http://localhost:9011  (minioadmin / minioadmin)"
echo "  Stop infra:       docker compose down"
echo "  Reset all data:   docker compose down -v"
echo ""
