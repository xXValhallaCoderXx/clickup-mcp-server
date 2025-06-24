#!/bin/bash

echo "🛑 Stopping Local ClickUp Ticket Creator"
echo "========================================"

docker compose down

echo "✅ All services stopped"
echo "💾 Data is preserved in Docker volumes"
echo "🚀 To start again: ./start-local.sh"