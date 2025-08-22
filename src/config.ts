export interface Config {
  domain: string;
  tenant?: string;
  privateKeyPath?: string;
  kid?: string;
  webhooksProxy?: {
    url: string;
    sharedSecret: string;
  };
}

// Export the interface explicitly to avoid import issues
export type { Config as ConfigType };

const configData = {
    domain: 'meet.jit.si',
    tenant: "vpaas-magic-cookie-example123456789abcdef",
    privateKeyPath: '/path/to/your/private-key.pem',
    kid: 'vpaas-magic-cookie-example123456789abcdef/sample01',
    webhooksProxy: {
        url: 'wss://your-webhook-proxy.example.com/ws',
        sharedSecret: 'YOUR_WEBHOOK_SHARED_SECRET_HERE'
    }
};

export async function loadConfig(): Promise<Config> {
  try {
    // Import the config directly
    const config = configData as Config;
    
    // Validate required fields
    validateConfig(config);
    
    return config;
  } catch (error) {
    console.error('Error loading config:', error);
    // Return default config for development
    return getDefaultConfig();
  }
}

function validateConfig(config: any): void {
  // Only domain is required
  if (!config.domain || typeof config.domain !== 'string' || config.domain.trim() === '') {
    throw new Error('Missing required config field: domain');
  }

  // Validate webhooksProxy structure if present
  if (config.webhooksProxy && (!config.webhooksProxy.url || !config.webhooksProxy.sharedSecret)) {
    throw new Error('Invalid webhooksProxy configuration - both url and sharedSecret are required when webhooksProxy is specified');
  }
}

function getDefaultConfig(): Config {
  return {
    domain: 'meet.jit.si'
  };
}
