#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$SCRIPT_DIR/server"
CLIENT_DIR="$SCRIPT_DIR/client"

CONTAINER_NAME="mobsf"
MOBSF_IMAGE="opensecurity/mobile-security-framework-mobsf:latest"
MOBSF_VOLUME="mobsf_data"

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo ""
echo -e "${CYAN}  ███╗   ███╗ ██████╗ ██████╗  █████╗ ██╗   ██╗██████╗ ██╗████████╗${NC}"
echo -e "${CYAN}  ████╗ ████║██╔═══██╗██╔══██╗██╔══██╗██║   ██║██╔══██╗██║╚══██╔══╝${NC}"
echo -e "${CYAN}  ██╔████╔██║██║   ██║██████╔╝███████║██║   ██║██║  ██║██║   ██║   ${NC}"
echo -e "${CYAN}  ██║╚██╔╝██║██║   ██║██╔══██╗██╔══██║██║   ██║██║  ██║██║   ██║   ${NC}"
echo -e "${CYAN}  ██║ ╚═╝ ██║╚██████╔╝██████╔╝██║  ██║╚██████╔╝██████╔╝██║   ██║   ${NC}"
echo -e "${CYAN}  ╚═╝     ╚═╝ ╚═════╝ ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚═════╝ ╚═╝   ╚═╝   ${NC}"
echo ""
echo -e "${CYAN}  Mobile Security Platform Startup${NC}"
echo -e "  ──────────────────────────────────────────────"
echo ""

echo -e "${CYAN}[0/4]${NC} 🧹 Cleaning up stale processes..."
# Kill any processes running on our ports (5000, 3000)
fuser -k 5001/tcp 2>/dev/null
fuser -k 3000/tcp 2>/dev/null
# Extra precaution: kill any node processes related to our project
pkill -f "node server.js" 2>/dev/null
echo -e "      ${GREEN}✅ Cleanup complete${NC}"
echo ""

# ──────────────────────────────────────────────
# 1. MobSF Container Management
# ──────────────────────────────────────────────
echo -e "${CYAN}[1/4]${NC} 📦 Managing MobSF container..."

# Search for container by name OR by image
RUNNING=$(docker ps -q --filter "name=^${CONTAINER_NAME}$" --filter "status=running" | head -n 1)
if [ -z "$RUNNING" ]; then
    RUNNING=$(docker ps -q --filter "ancestor=${MOBSF_IMAGE}" --filter "status=running" | head -n 1)
fi

# Check if the running container is healthy (if it has a healthcheck)
HEALTH=$(docker inspect --format '{{.State.Health.Status}}' "$RUNNING" 2>/dev/null)
if [ "$HEALTH" == "unhealthy" ]; then
    echo -e "      ${RED}⚠️  MobSF container is unhealthy. Recreating...${NC}"
    docker stop "$RUNNING" >/dev/null 2>&1
    docker rm "$RUNNING" >/dev/null 2>&1
    RUNNING=""
fi

STOPPED=$(docker ps -aq --filter "name=^${CONTAINER_NAME}$" || docker ps -aq --filter "ancestor=${MOBSF_IMAGE}" | head -n 1)

# If found a container with different name, update CONTAINER_NAME for this session
if [ -n "$RUNNING" ]; then
    DETECTED_NAME=$(docker inspect --format '{{.Name}}' "$RUNNING" | sed 's/\///')
    if [ "$DETECTED_NAME" != "$CONTAINER_NAME" ]; then
        CONTAINER_NAME="$DETECTED_NAME"
        echo -e "      ${YELLOW}ℹ️  Using MobSF container: ${CONTAINER_NAME}${NC}"
    fi
elif [ -n "$STOPPED" ]; then
    DETECTED_NAME=$(docker inspect --format '{{.Name}}' "$STOPPED" | sed 's/\///')
     if [ "$DETECTED_NAME" != "$CONTAINER_NAME" ]; then
        CONTAINER_NAME="$DETECTED_NAME"
        echo -e "      ${YELLOW}ℹ️  Detected MobSF container: ${CONTAINER_NAME}${NC}"
    fi
fi

if [ -n "$RUNNING" ]; then
  echo -e "      ${GREEN}✅ MobSF is already running${NC}"
elif [ -n "$STOPPED" ]; then
  echo -e "      ${YELLOW}🔄 Starting stopped MobSF container...${NC}"
  docker start "$CONTAINER_NAME" > /dev/null
  echo -e "      ${GREEN}✅ MobSF container started${NC}"
else
  echo -e "      🚀 Creating new MobSF container with persistent volume..."
  docker run -d \
    --name "$CONTAINER_NAME" \
    -p 8000:8000 \
    -v ${MOBSF_VOLUME}:/home/mobsf/.MobSF \
    "$MOBSF_IMAGE" > /dev/null
  echo -e "      ${GREEN}✅ MobSF container created${NC}"
fi

# ──────────────────────────────────────────────
# 2. Wait for MobSF to be ready
# ──────────────────────────────────────────────
echo ""
echo -e "${CYAN}[2/4]${NC} ⏳ Waiting for MobSF to be ready..."

RETRIES=0
MAX_RETRIES=40
until curl -s http://127.0.0.1:8000/api_docs > /dev/null 2>&1; do
  RETRIES=$((RETRIES + 1))
  if [ "$RETRIES" -ge "$MAX_RETRIES" ]; then
    echo -e "      ${YELLOW}⚠️  MobSF didn't respond in time — continuing anyway${NC}"
    break
  fi
  printf "      Waiting for MobSF... (%d/%d)\r" "$RETRIES" "$MAX_RETRIES"
  sleep 3
done

if [ "$RETRIES" -lt "$MAX_RETRIES" ]; then
  echo -e "      ${GREEN}✅ MobSF is ready!                        ${NC}"
fi

# ──────────────────────────────────────────────
# 3. Sync MobSF API Key → .env
# ──────────────────────────────────────────────
echo ""
echo -e "${CYAN}[3/4]${NC} 🔑 Syncing MobSF API key..."

# Extract the REST API Key from MobSF container logs
# IMPORTANT: We MUST strip ANSI color codes (sed) because they break Node.js network headers
API_KEY=$(docker logs "$CONTAINER_NAME" 2>&1 | grep "REST API Key" | tail -n 1 | awk -F': ' '{print $2}' | sed 's/\x1b\[[0-9;]*m//g' | tr -d '\r\n ')

if [ -n "$API_KEY" ]; then
  # Use a temporary file to rebuild .env safely
  touch "$SERVER_DIR/.env"
  if grep -q "MOBSF_API_KEY" "$SERVER_DIR/.env"; then
    sed -i "s|^MOBSF_API_KEY=.*|MOBSF_API_KEY=${API_KEY}|" "$SERVER_DIR/.env"
  else
    echo "MOBSF_API_KEY=${API_KEY}" >> "$SERVER_DIR/.env"
  fi
  echo -e "      ${GREEN}✅ API key synced from logs!${NC}"
else
  echo -e "      ${YELLOW}⚠️  Could not find API key in logs — check if MobSF started correctly${NC}"
fi

# ──────────────────────────────────────────────
# 4. Start Server + Client
# ──────────────────────────────────────────────
echo ""
echo -e "${CYAN}[4/4]${NC} 🚀 Starting MobAudit services..."
echo ""

# Start backend
(cd "$SERVER_DIR" && npm start 2>&1 | sed 's/^/  [server] /') &
SERVER_PID=$!

# Give the server a moment to initialize
sleep 2

# Start frontend
(cd "$CLIENT_DIR" && npm start 2>&1 | sed 's/^/  [client] /') &
CLIENT_PID=$!

echo ""
echo -e "  ──────────────────────────────────────────────"
echo -e "  ${GREEN}✅ MobAudit is launching!${NC}"
echo ""
echo -e "  🖥️  Backend  → ${CYAN}http://127.0.0.1:5001${NC}"
  echo -e "  🌐 Frontend → ${CYAN}http://127.0.0.1:3000${NC}"
  echo -e "  🔍 MobSF    → ${CYAN}http://127.0.0.1:8000${NC}"

echo ""
echo -e "  Press ${YELLOW}Ctrl+C${NC} to stop all services"
echo -e "  ──────────────────────────────────────────────"
echo ""

# Graceful shutdown on Ctrl+C
cleanup() {
  echo ""
  echo -e "${YELLOW}🛑 Stopping MobAudit services...${NC}"
  kill "$SERVER_PID" "$CLIENT_PID" 2>/dev/null
  wait "$SERVER_PID" "$CLIENT_PID" 2>/dev/null
  echo -e "${GREEN}✅ All services stopped.${NC}"
  echo ""
  exit 0
}

trap cleanup SIGINT SIGTERM
wait "$SERVER_PID" "$CLIENT_PID"
