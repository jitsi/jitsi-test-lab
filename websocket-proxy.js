#!/usr/bin/env node

import WebSocket, { WebSocketServer } from 'ws';
import http from 'http';
import { promises as dns } from 'dns';
import { loadServerConfig } from './server-config.js';

/**
 * Local WebSocket proxy server that handles authentication headers
 * for the JaaS webhook proxy connection.
 * 
 * This server:
 * 1. Accepts WebSocket connections from the browser (no auth headers possible)
 * 2. Establishes authenticated connections to the remote webhook proxy
 * 3. Bridges messages between browser and remote server
 * 4. Serves configuration to clients via HTTP endpoint
 */

// Load configuration from filesystem
let serverConfig;
try {
  serverConfig = loadServerConfig();
} catch (error) {
  console.error('Failed to load configuration. Exiting.');
  process.exit(1);
}

const LOCAL_PORT = 8080;
const REMOTE_WS_URL = serverConfig.webhooksProxy.url;
const SHARED_SECRET = serverConfig.webhooksProxy.sharedSecret;
const TENANT = serverConfig.tenant;

// Fallback echo server for testing when main server is unreachable
const FALLBACK_WS_URL = 'wss://echo.websocket.org/';
const USE_FALLBACK = process.env.USE_FALLBACK === 'true';

// Create HTTP server for WebSocket upgrade only
const server = http.createServer((req, res) => {
  // Handle other requests
  res.writeHead(404);
  res.end('Not Found');
});

// Create WebSocket server
const wss = new WebSocketServer({ 
  server,
  path: '/webhook-proxy'
});

console.log(`🚀 WebSocket Proxy Server starting on port ${LOCAL_PORT}`);
console.log(`📡 Will proxy to: ${USE_FALLBACK ? FALLBACK_WS_URL : REMOTE_WS_URL}`);
if (USE_FALLBACK) {
  console.log(`⚠️  Using FALLBACK echo server for testing`);
} else {
  console.log(`🔐 Using shared secret: ${SHARED_SECRET.substring(0, 8)}...`);
  console.log(`🏢 Tenant: ${TENANT}`);
  console.log(`📝 Will add ?tenant=TENANT&room=ROOM to remote connections`);
}

wss.on('connection', async (browserWs, request) => {
  const clientId = Math.random().toString(36).substring(7);
  console.log(`🔌 Browser client connected: ${clientId}`);
  
  // Extract conference name from URL query params if provided
  const url = new URL(request.url, `http://localhost:${LOCAL_PORT}`);
  const conferenceName = url.searchParams.get('conference') || 'unknown';
  
  console.log(`📋 Conference: ${conferenceName}`);
  
  let targetUrl = USE_FALLBACK ? FALLBACK_WS_URL : REMOTE_WS_URL;
  
  // Add tenant and room parameters for the main server
  if (!USE_FALLBACK) {
    const urlObj = new URL(targetUrl);
    urlObj.searchParams.set('tenant', TENANT);
    urlObj.searchParams.set('room', conferenceName);
    targetUrl = urlObj.toString();
    console.log(`🔗 Target URL with params: ${targetUrl}`);
  }
  
  const hostname = new URL(targetUrl).hostname;
  
  // Test DNS resolution first
  console.log(`🔍 Testing DNS resolution for: ${hostname}`);
  
  try {
    const addresses = await dns.lookup(hostname);
    console.log(`✅ DNS resolved: ${hostname} → ${addresses.address}`);
  } catch (dnsError) {
    console.error(`💥 DNS resolution failed for ${hostname}:`, dnsError);
    
    if (browserWs.readyState === WebSocket.OPEN) {
      browserWs.send(JSON.stringify({
        type: 'proxy-error',
        conference: conferenceName,
        error: `DNS resolution failed: ${dnsError.message}`,
        timestamp: new Date().toISOString()
      }));
    }
    return;
  }
  
  console.log(`🔌 Connecting to: ${targetUrl}`);
  
  // Connect to remote webhook proxy with authentication
  const wsOptions = {
    handshakeTimeout: 10000,
    perMessageDeflate: false
  };
  
  // Add auth headers only for main server, not for fallback echo server
  if (!USE_FALLBACK) {
    wsOptions.headers = {
      'Authorization': SHARED_SECRET,
      'User-Agent': 'JaaS-Test-Proxy/1.0',
      'X-Conference': conferenceName
    };
  }
  
  const remoteWs = new WebSocket(targetUrl, wsOptions);
  
  // Handle remote connection
  remoteWs.on('open', () => {
    console.log(`✅ Connected to remote webhook proxy for ${conferenceName}`);
    
    // Send connection confirmation to browser
    if (browserWs.readyState === WebSocket.OPEN) {
      browserWs.send(JSON.stringify({
        type: 'proxy-connected',
        conference: conferenceName,
        timestamp: new Date().toISOString()
      }));
    }
  });
  
  remoteWs.on('message', (data) => {
    const messageStr = data.toString();
    console.log(`📨 Message from remote [${conferenceName}]:`, messageStr);
    
    try {
      // Parse message to check if it's for this room
      const msg = JSON.parse(messageStr);
      
      // Check if message has an FQN and if it matches our room
      if (msg.fqn) {
        const expectedFqn = `${TENANT}/${conferenceName}`;
        if (msg.fqn !== expectedFqn) {
          console.log(`🚫 Message FQN mismatch: expected ${expectedFqn}, got ${msg.fqn}`);
          return; // Don't forward messages for other rooms
        }
        console.log(`✅ Message FQN matches: ${msg.fqn}`);
      }
    } catch (parseError) {
      // If it's not JSON, just forward it
      console.log(`📝 Non-JSON message, forwarding as-is`);
    }
    
    // Forward message to browser
    if (browserWs.readyState === WebSocket.OPEN) {
      browserWs.send(data);
    }
  });
  
  remoteWs.on('close', (code, reason) => {
    console.log(`❌ Remote connection closed [${conferenceName}]:`, code, reason.toString());
    
    // Notify browser of disconnection
    if (browserWs.readyState === WebSocket.OPEN) {
      browserWs.send(JSON.stringify({
        type: 'proxy-disconnected',
        conference: conferenceName,
        code,
        reason: reason.toString(),
        timestamp: new Date().toISOString()
      }));
      browserWs.close();
    }
  });
  
  remoteWs.on('error', (error) => {
    console.error(`💥 Remote connection error [${conferenceName}]:`, error);
    
    // Send error to browser
    if (browserWs.readyState === WebSocket.OPEN) {
      browserWs.send(JSON.stringify({
        type: 'proxy-error',
        conference: conferenceName,
        error: error.message,
        timestamp: new Date().toISOString()
      }));
    }
  });
  
  // Handle browser messages
  browserWs.on('message', (data) => {
    const messageStr = data.toString();
    console.log(`📤 Message from browser [${conferenceName}]:`, messageStr);
    
    try {
      // Parse message and add FQN if it's a response to a SETTINGS_PROVISIONING request
      const msg = JSON.parse(messageStr);
      
      // If this looks like a settings response, ensure it has the proper context
      if (msg && typeof msg === 'object' && !msg.fqn && !msg.eventType) {
        // This might be a SETTINGS_PROVISIONING response
        console.log(`🔧 Adding context to browser response`);
        msg.fqn = `${TENANT}/${conferenceName}`;
        
        const modifiedMessage = JSON.stringify(msg);
        console.log(`📤 Modified message:`, modifiedMessage);
        
        if (remoteWs.readyState === WebSocket.OPEN) {
          remoteWs.send(modifiedMessage);
        } else {
          console.warn(`⚠️  Remote connection not ready, message dropped [${conferenceName}]`);
        }
        return;
      }
    } catch (parseError) {
      // If it's not JSON, just forward as-is
      console.log(`📝 Non-JSON browser message, forwarding as-is`);
    }
    
    // Forward message to remote server as-is
    if (remoteWs.readyState === WebSocket.OPEN) {
      remoteWs.send(data);
    } else {
      console.warn(`⚠️  Remote connection not ready, message dropped [${conferenceName}]`);
    }
  });
  
  browserWs.on('close', (code, reason) => {
    console.log(`🔌 Browser client disconnected [${conferenceName}]:`, code, reason.toString());
    
    // Close remote connection
    if (remoteWs.readyState === WebSocket.OPEN) {
      remoteWs.close();
    }
  });
  
  browserWs.on('error', (error) => {
    console.error(`💥 Browser connection error [${conferenceName}]:`, error);
  });
});

// Start server
server.listen(LOCAL_PORT, () => {
  console.log(`🎯 WebSocket Proxy Server listening on http://localhost:${LOCAL_PORT}`);
  console.log(`📡 Browser should connect to: ws://localhost:${LOCAL_PORT}/webhook-proxy?conference=CONFERENCE_NAME`);
  console.log(`\n🔄 Ready to proxy WebSocket connections with authentication!\n`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down WebSocket Proxy Server...');
  server.close(() => {
    console.log('👋 WebSocket Proxy Server stopped');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  server.close(() => {
    console.log('👋 WebSocket Proxy Server stopped');
    process.exit(0);
  });
});