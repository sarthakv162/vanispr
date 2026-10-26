#!/usr/bin/env bash
# VaniSPR Research Suite - Unix Launcher Script
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

echo "================================================================"
echo "   VaniSPR · Psycholinguistic Self-Paced Reading Suite"
echo "================================================================"

# Use virtualenv python if available
if [ -f "$DIR/.venv/bin/python" ]; then
    PY="$DIR/.venv/bin/python"
else
    PY="python3"
fi

# Cleanup function on Ctrl+C
cleanup() {
    echo ""
    echo "🛑 Stopping VaniSPR services..."
    kill $(jobs -p) 2>/dev/null || true
    echo "Done."
    exit 0
}
trap cleanup SIGINT SIGTERM EXIT

echo "▶ Starting FastAPI Backend on http://127.0.0.1:8000..."
"$PY" backend/run.py &
BACKEND_PID=$!

echo "▶ Starting Vite Frontend on http://localhost:5173..."
(cd frontend && npm run dev) &
FRONTEND_PID=$!

sleep 2

echo ""
echo "================================================================"
echo "  🎉 VaniSPR is running!"
echo "  🌐 Researcher Console:   http://localhost:5173"
echo "  📖 Interactive API Docs: http://127.0.0.1:8000/docs"
echo "================================================================"
echo "[Press CTRL + C at any time to stop]"

# Open browser if available
if which xdg-open > /dev/null; then
    xdg-open "http://localhost:5173" 2>/dev/null || true
elif which open > /dev/null; then
    open "http://localhost:5173" 2>/dev/null || true
fi

wait
