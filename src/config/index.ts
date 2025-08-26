// Configuration interface
export interface Config {
  domain: string;
  tenant?: string;
  kid?: string;
  privateKey?: string;
  webhooksProxy?: {
    url: string;
    sharedSecret: string;
  };
  presets?: ConfigPreset[];
}

export interface ConfigPreset {
  name: string;
  domain: string;
  tenant?: string;
  kid?: string;
  privateKey?: string;
  webhooksProxy?: {
    url: string;
    sharedSecret: string;
  };
}

// Default configuration - used as fallback and type reference
export const defaultConfig: Config = {
  domain: 'meet.jit.si'
};

// Load configuration from webserver (supports runtime config.json)
export async function loadConfig(): Promise<Config> {
  try {
    // Load configuration from config.json served by webserver
    const response = await fetch('./config.json?t=' + Date.now());
    
    if (!response.ok) {
      if (response.status === 404) {
        console.warn('Configuration not found, using default config');
        return defaultConfig;
      }
      throw new Error(`Failed to load configuration: ${response.status} ${response.statusText}`);
    }
    
    const configData = await response.json();
    
    // Use the first preset as the active configuration, fallback to direct config
    const loadedConfig = configData.presets?.[0] || configData;
    
    // Validate that required domain field is present
    if (!loadedConfig.domain) {
      console.warn('No domain in config, using default');
      return defaultConfig;
    }
    
    // Validate webhooksProxy structure if present
    if (loadedConfig.webhooksProxy && (!loadedConfig.webhooksProxy.url || !loadedConfig.webhooksProxy.sharedSecret)) {
      console.warn('Invalid webhooksProxy configuration, ignoring it');
      delete loadedConfig.webhooksProxy;
    }
    
    console.log('✅ Configuration loaded from config.json:', loadedConfig.name || 'Default');
    return { ...loadedConfig, presets: configData.presets } as Config;
    
  } catch (error) {
    console.warn('❌ Failed to load config.json, using default configuration:', error);
    return defaultConfig;
  }
}