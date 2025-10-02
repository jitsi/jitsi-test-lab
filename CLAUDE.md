# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Jitsi Test Lab is a React-based testing application for Jitsi Meet and Jitsi as a Service (JaaS). It provides manual testing capabilities, JWT token generation, webhook monitoring, and configuration management for developers working with Jitsi video conferencing solutions.

## Development Commands

```bash
npm run dev      # Start Vite development server (port 5173)
npm run build    # Build for production
npm run lint     # Run ESLint code checking
npm run preview  # Preview production build
```

For full development environment with WebSocket proxy:
```bash
./start-dev.sh   # Starts both WebSocket proxy (port 8080) and React dev server
```

Note: The WebSocket proxy (`websocket-proxy.js`) runs on port 8080 and bridges connections between the browser and remote JaaS webhook proxy servers.

## Architecture Overview

**Tech Stack:**
- React 19.1.1 with TypeScript
- Material-UI (MUI) 7.3.1 for components
- Vite 7.1.2 for build tooling
- JOSE library for JWT token handling
- WebSocket proxy server for webhook testing

**Key Components Structure:**
- `src/components/IFrameControlPage.tsx` - Jitsi Meet iframe controls
- `src/components/JaaSConfigPage.tsx` - JaaS configuration management
- `src/components/TokensPage.tsx` - JWT token generation for JaaS
- `src/components/WebhooksPage.tsx` - Webhook testing interface
- `src/components/SettingsPage.tsx` - Application settings
- `token.ts` - JWT token generation logic (root level)
- `websocket-proxy.js` - Local WebSocket proxy server (root level)

**Configuration System:**
- `public/config.json` - Public configuration presets (exposed to users)
- `src/config.ts` - Configuration loading logic
- Local storage for user-specific settings
- Runtime configuration updates supported

## Development Workflow

**WebSocket Proxy Integration:**
The application includes a local WebSocket proxy server that handles authentication headers for JaaS webhook connections. The proxy:
1. Accepts connections from browsers (which can't send auth headers)
2. Establishes authenticated connections to remote webhook proxies
3. Bridges messages between browser and remote servers

**JaaS Integration:**
- JWT token generation using private keys via JOSE library
- Tenant configuration (vpaas-magic-cookie-* format)
- API key integration with kid parameter
- Webhook shared secret management

**Security Notes:**
- `public/config.json` is intentionally exposed - never include private keys
- Private keys should only be used with dedicated testing accounts
- Local storage handles sensitive configuration in browser

## Docker Deployment

Multi-stage Docker build process:
- Build stage uses Node.js 20 Alpine
- Production stage uses Nginx Alpine
- Automatic Docker Hub publishing via GitHub Actions
- Support for custom config.json via volume mounts

## Testing Integration

The application integrates with external webhook testing via:
- `jaas-test-wh-proxy` deployment required for webhook testing
- WebSocket connection to proxy servers
- Real-time webhook event monitoring
- Shared secret authentication for webhook security