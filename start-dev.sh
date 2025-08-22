#!/bin/bash

echo "🚀 Starting Jitsi Test Lab Development Environment"
echo ""
echo "Starting services:"
echo "  📡 WebSocket Proxy Server (Port 8080)"
echo "  ⚛️  React Development Server (Port 5173)"
echo ""
echo "🔗 App will be available at: http://localhost:5173"
echo "📊 WebSocket Proxy at: ws://localhost:8080/webhook-proxy"
echo ""
echo "Press Ctrl+C to stop both services"
echo ""

# Run both the proxy server and React dev server concurrently
npm run dev:all