# Configuration Guide

This document explains how to configure the Jitsi Test Lab before running it.

## Setup Steps

1. **Copy the example configuration:**
   ```bash
   cp config.example.json config.json
   ```

2. **Edit `config.json` with your JaaS credentials:**
   - Update the `domain`, `tenant`, and `kid` values
   - Set the `privateKeyPath` to point to your private key file
   - Adjust webhook proxy settings if needed

3. **Run the development server:**
   ```bash
   npm run dev:all
   ```
   This will start the React development server with direct config.json loading.

## Configuration File Structure

The `config.json` file should contain:

```json
{
    "presets": [
        {
            "name": "Example JaaS Configuration",
            "domain": "meet.jit.si",
            "tenant": "vpaas-magic-cookie-example123456789abcdef",
            "kid": "vpaas-magic-cookie-example123456789abcdef/sample01",
            "privateKey": "-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_CONTENT_GOES_HERE\n-----END PRIVATE KEY-----",
            "webhooksProxy": {
                "url": "wss://your-webhook-proxy.example.com/ws",
                "sharedSecret": "YOUR_WEBHOOK_SHARED_SECRET_HERE"
            }
        },
        {
            "name": "Basic Public Jitsi Meet",
            "domain": "meet.jit.si"
        }
    ]
}
```

## Configuration Fields

### Required Fields

- **`domain`**: The Jitsi Meet domain (e.g., `meet.jit.si`, `8x8.vc`)
- **`name`**: A descriptive name for this configuration preset

### Optional Fields (for JaaS Authentication)

- **`tenant`**: Your JaaS tenant ID (leave empty for public Jitsi Meet)
- **`kid`**: Your key ID in the format `tenant/keyid` (leave empty for anonymous access)
- **`privateKey`**: Your private key content in PEM format (leave empty for public access)
- **`webhooksProxy.url`**: WebSocket URL for the webhook proxy (optional)
- **`webhooksProxy.sharedSecret`**: Shared secret for webhook proxy authentication (optional)

### Private Key Format

When using JaaS authentication, the private key should be in PEM format:

```
-----BEGIN PRIVATE KEY-----
YOUR_ACTUAL_PRIVATE_KEY_CONTENT_HERE
-----END PRIVATE KEY-----
```

**Important**: 
- Private keys are stored directly in the configuration
- Use proper JSON escaping for newlines (`\n`)

## How Configuration is Used

### Startup
- Configuration is loaded directly from `config.json` by the React application
- Uses the first preset as the active configuration
- All required fields are validated at runtime
- Missing domain field will fall back to default configuration

### JWT Token Generation
- The Tokens page automatically uses `kid` and `privateKey` from config
- You can override these values in the UI if needed for testing

### WebhookProxy Connections
- Each conference uses the webhook proxy settings from config
- Connections are established automatically based on config values

## Troubleshooting

### Configuration Loading Errors

**Error**: `Missing required configuration fields`
- **Solution**: Ensure all required fields are present in `config.json`

**Error**: `Failed to load configuration`
- **Solution**: 
  1. Verify `config.json` exists in the project root
  2. Check that the file contains valid JSON syntax
  3. Ensure no syntax errors (missing commas, quotes)
  4. Verify the configuration has at least a domain field

### JWT Generation Errors

**Error**: `Failed to generate token`
- **Solution**: 
  1. Verify your private key is valid and complete
  2. Check that the `kid` format matches your JaaS configuration
  3. Ensure the private key corresponds to the public key registered with JaaS
  4. Verify the private key has proper PEM format

## Security Notes

1. **Never commit `config.json`** - it contains sensitive credentials
2. The `config.json` file should be added to `.gitignore`
3. Only share configuration template files (`config.example.json`)
4. Rotate private keys regularly

## File Structure

```
jitsi-test-lab/
├── config.json               # Your actual configuration (DO NOT COMMIT)
├── config.example.json       # Template configuration file
├── websocket-proxy.js        # WebSocket proxy server
├── src/
│   └── config/
│       └── index.ts          # Configuration loader
└── CONFIG.md                 # This documentation file
```
