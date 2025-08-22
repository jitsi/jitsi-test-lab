# WebSocket Proxy Connection

This document explains the direct WebSocket connection setup for the Jitsi Test Lab.

## Architecture

```
Browser WebhookProxy ←→ Remote Webhook Proxy
    (direct connection with secret param)
```

## Connection Details

The browser connects directly to:
- **Remote URL**: `wss://your-webhook-proxy.example.com/ws`
- **Authentication**: Via `secret` URL parameter
- **Tenant**: Via `tenant` URL parameter
- **Room**: Via `room` URL parameter

Example connection URL:
```
wss://your-webhook-proxy.example.com/ws?secret=YOUR_WEBHOOK_SHARED_SECRET&tenant=vpaas-magic-cookie-example123456789abcdef&room=test-room
```

## Files

- **`src/WebhookProxy.ts`** - Browser WebSocket client with direct connection

## Usage

Simply start the React development server:

```bash
npm run dev
```

The WebSocket connection will be established automatically when the app loads.

## Configuration

Configuration is loaded from `config.json` and includes:

```json
{
  "webhooksProxy": {
    "url": "wss://your-webhook-proxy.example.com/ws",
    "sharedSecret": "YOUR_WEBHOOK_SHARED_SECRET_HERE"
  }
}
```

## Message Flow

1. **Browser → Remote Server**: WebSocket messages with authentication via URL parameter
2. **Remote Server → Browser**: Webhook events and responses

## Troubleshooting

**Connection Issues:**
- Check browser console for WebSocket connection errors
- Verify remote webhook proxy URL is accessible
- Ensure network allows WebSocket connections to the remote server

**Authentication Errors:**
- Verify `sharedSecret` in config matches the webhook proxy configuration
- Check that the remote proxy supports authentication via URL parameters
