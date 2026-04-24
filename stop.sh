#!/bin/bash

echo "========================================"
echo "  Music Practice App - Stop Server"
echo "========================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

# Kill processes on port 5174
echo "[INFO] Stopping development server..."

# Find and kill process on port 5174
PID=$(lsof -t -i:5174 2>/dev/null)
if [ ! -z "$PID" ]; then
    kill -9 $PID 2>/dev/null
    echo -e "${GREEN}[OK] Killed process on port 5174${NC}"
fi

# Also try to kill node processes
pkill -f "vite" 2>/dev/null
if [ $? -eq 0 ]; then
    echo -e "${GREEN}[OK] Stopped Vite processes${NC}"
fi

echo ""
echo "[DONE] Server stopped."