#!/bin/bash

echo "🚀 Starting Local ClickUp Ticket Creator with N8N"
echo "=================================================="

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from template..."
    cp .env.example .env
    echo "📝 Please edit .env file with your credentials before continuing."
    echo "   Required: CLICKUP_API_TOKEN, CLICKUP_LIST_ID, OPENROUTER_API_KEY"
    exit 1
fi

# Create N8N workflows directory if it doesn't exist
mkdir -p n8n-workflows

echo "🐳 Starting services with Docker Compose..."
docker compose up -d

echo "⏳ Waiting for services to start..."
sleep 10

# Check if services are running
if curl -s http://localhost:3000/api/health > /dev/null; then
    echo "✅ Web App is running at http://localhost:3000"
else
    echo "❌ Web App failed to start"
fi

if curl -s http://localhost:5678 > /dev/null; then
    echo "✅ N8N is running at http://localhost:5678"
else
    echo "❌ N8N failed to start"
fi

echo ""
echo "🎯 Quick Start:"
echo "   1. Open http://localhost:3000 for the ticket creator"
echo "   2. Open http://localhost:5678 for N8N workflow management"
echo "   3. Configure your company context in the web app"
echo "   4. Import the workflow in N8N (n8n-workflows/ticket-creation-workflow.json)"
echo ""
echo "🛑 To stop: ./stop-local.sh or docker-compose down"