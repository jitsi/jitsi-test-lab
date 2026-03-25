import { SignJWT, importPKCS8 } from 'jose';
import { v4 as uuidv4 } from 'uuid';

export interface TokenOptions {
    displayName?: string;
    /**
     * The user's email address to include in the token.
     */
    email?: string;
    /**
     * The URL of the user's avatar image.
     */
    avatarUrl?: string;
    /**
     * The duration for which the token is valid, e.g. "1h" for one hour.
     */
    exp?: string;
    /**
     * The key ID to use for the token.
     */
    keyId: string;
    /**
     * The private key content (not path) used to sign the token (for RS256).
     */
    privateKey?: string;
    /**
     * The JWT algorithm to use. Defaults to 'RS256'.
     */
    jwtAlgorithm?: 'RS256' | 'HS256';
    /**
     * The shared secret to use for HS256 signing.
     */
    jwtSecret?: string;
    /**
     * Whether to set the 'moderator' flag.
     */
    moderator?: boolean;
    /**
     * The room for which the token is valid, or '*'. Defaults to '*'.
     */
    room?: string;
    /**
     * Custom subject. If not provided, will be derived from keyId.
     */
    sub?: string;
    /**
     * Whether to set the 'visitor' flag.
     */
    visitor?: boolean;
    /**
     * JWT permissions for JaaS features.
     */
    permissions?: Record<string, boolean>;
}

export interface Token {
    /**
     * The JWT headers, for easy reference.
     */
    headers: any;
    /**
     * The signed JWT.
     */
    jwt: string;
    /**
     * The options used to generate the token.
     */
    options: TokenOptions;
    /**
     * The token's payload, for easy reference.
     */
    payload: any;
}

function parseExpiration(exp: string): number {
    const now = Math.floor(Date.now() / 1000);
    const match = exp.match(/^(\d+)([smhd])$/);
    
    if (!match) {
        // Default to 24 hours if format is invalid
        return now + (24 * 60 * 60);
    }
    
    const [, amount, unit] = match;
    const seconds = parseInt(amount, 10);
    
    switch (unit) {
        case 's': return now + seconds;
        case 'm': return now + (seconds * 60);
        case 'h': return now + (seconds * 60 * 60);
        case 'd': return now + (seconds * 24 * 60 * 60);
        default: return now + (24 * 60 * 60);
    }
}

export function generatePayload(options: TokenOptions): any {
    // Build features object from permissions (excluding admin which goes to root)
    const features: Record<string, boolean | string> = {};

    if (options.permissions) {
        Object.entries(options.permissions).forEach(([key, value]) => {
            if (value && key !== 'admin') { // Exclude admin from features
                // Convert boolean true to string 'true' for certain permissions for compatibility
                if (['outbound-call', 'transcription', 'recording'].includes(key)) {
                    features[key] = 'true';
                } else {
                    features[key] = true;
                }
            }
        });
    }

    // For HS256, use the tenant as sub if keyId doesn't have a slash
    const sub = options.sub || (options.keyId.indexOf('/') > 0 ? options.keyId.substring(0, options.keyId.indexOf('/')) : options.keyId);

    const payload = {
        'aud': 'jitsi',
        'iss': 'chat',
        'sub': sub,
        'exp': parseExpiration(options.exp || '24h'),
        'context': {
            'user': {
                'name': options.displayName || '',
                'id': uuidv4(),
                'avatar': options.avatarUrl || '',
                'email': options.email || ''
            },
            'group': uuidv4(),
            'features': features,
        },
        'room': options.room || '*'
    };

    if (options.moderator) {
        (payload.context.user as any).moderator = true;
    } else if (options.visitor) {
        (payload.context.user as any).role = 'visitor';
    }

    // Handle hidden-from-recorder as a user property
    if (options.permissions?.['hidden-from-recorder']) {
        (payload.context.user as any)['hidden-from-recorder'] = true;
    }

    // Handle admin permission at root level
    if (options.permissions?.admin) {
        (payload as any).admin = true; // eslint-disable-line @typescript-eslint/no-explicit-any
    }

    return payload;
}

/**
 * Generate a signed token.
 */
export async function generateToken(options: TokenOptions): Promise<Token> {
    if (!options.keyId) {
        throw new Error('No keyId provided');
    }

    const algorithm = options.jwtAlgorithm || 'RS256';

    // Validate required fields based on algorithm
    if (algorithm === 'RS256' && !options.privateKey) {
        throw new Error('No private key provided for RS256 algorithm');
    }
    if (algorithm === 'HS256' && !options.jwtSecret) {
        throw new Error('No shared secret provided for HS256 algorithm');
    }

    const payload = generatePayload({
        ...options,
        displayName: options.displayName || '',
        sub: options.sub || (options.keyId.indexOf('/') > 0 ? options.keyId.substring(0, options.keyId.indexOf('/')) : options.keyId)
    });

    try {
        let jwt: string;

        if (algorithm === 'HS256') {
            // Use shared secret for HS256
            console.log('Using HS256 algorithm with shared secret');
            const secret = new TextEncoder().encode(options.jwtSecret);

            jwt = await new SignJWT(payload)
                .setProtectedHeader({
                    alg: 'HS256',
                    typ: 'JWT'
                })
                .setIssuedAt()
                .setNotBefore(Math.floor(Date.now() / 1000))
                .setExpirationTime(payload.exp)
                .sign(secret);
        } else {
            // Use private key for RS256
            console.log('Private key format check:', {
                hasBeginMarker: options.privateKey!.includes('-----BEGIN PRIVATE KEY-----'),
                hasRSAMarker: options.privateKey!.includes('-----BEGIN RSA PRIVATE KEY-----'),
                keyLength: options.privateKey!.length,
                keyStart: options.privateKey!.substring(0, 100),
                keyEnd: options.privateKey!.substring(options.privateKey!.length - 50)
            });

            // Fix escaped newlines in private key (common when stored in JSON)
            const formattedPrivateKey = options.privateKey!.replace(/\\n/g, '\n');

            console.log('After newline fix:', {
                keyLength: formattedPrivateKey.length,
                keyStart: formattedPrivateKey.substring(0, 100),
                keyEnd: formattedPrivateKey.substring(formattedPrivateKey.length - 50),
                hasProperEnd: formattedPrivateKey.includes('-----END PRIVATE KEY-----')
            });

            // Handle RSA format keys by giving a clear error message
            if (formattedPrivateKey.includes('-----BEGIN RSA PRIVATE KEY-----')) {
                throw new Error(`Private key is in RSA format but PKCS#8 format is required. Please convert your RSA private key to PKCS#8 format using: openssl pkcs8 -topk8 -inform PEM -outform PEM -nocrypt -in your_rsa_key.pem | awk '{printf "%s\\\\n", $0}' and update the config.json file.`);
            }

            // Import PKCS#8 format key
            console.log('Using PKCS#8 format key');
            const privateKey = await importPKCS8(formattedPrivateKey, 'RS256');

            // Create and sign the JWT
            jwt = await new SignJWT(payload)
                .setProtectedHeader({
                    alg: 'RS256',
                    typ: 'JWT',
                    kid: options.keyId
                })
                .setIssuedAt()
                .setNotBefore(Math.floor(Date.now() / 1000))
                .setExpirationTime(payload.exp)
                .sign(privateKey);
        }

        const headers = {
            algorithm: algorithm,
            typ: 'JWT',
            keyid: algorithm === 'RS256' ? options.keyId : undefined,
        };

        return {
            headers,
            jwt,
            options,
            payload
        };
    } catch (error) {
        console.error('Token generation detailed error:', error);
        throw new Error(`Failed to generate token: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Generate a signed token and return just the JWT string.
 */
export async function generateJwt(options: TokenOptions): Promise<string> {
    const token = await generateToken(options);
    return token.jwt;
}

/**
 * Generate a conference link with JWT token.
 */
export function generateConferenceLink(
    domain: string, 
    tenant: string | undefined, 
    room: string, 
    token: string, 
    options?: { 
        prejoinScreen?: 'default' | 'on' | 'off';
        p2pSetting?: 'default' | 'on' | 'off';
        audioSetting?: 'default' | 'on' | 'off';
        videoSetting?: 'default' | 'on' | 'off';
        configOverrides?: Array<{key: string, value: string, id: string}>;
    }
): string {
    // Build URL with optional tenant
    const tenantPart = tenant ? `/${tenant}` : '';
    const jwtPart = token ? `?jwt=${token}` : '';
    const baseUrl = `https://${domain}${tenantPart}/${room}${jwtPart}`;
    const configParams: string[] = [];
    
    if (options?.prejoinScreen === 'off') {
        configParams.push('config.prejoinConfig.enabled=false');
    } else if (options?.prejoinScreen === 'on') {
        configParams.push('config.prejoinConfig.enabled=true');
    }
    
    if (options?.p2pSetting === 'off') {
        configParams.push('config.p2p.enabled=false');
    } else if (options?.p2pSetting === 'on') {
        configParams.push('config.p2p.enabled=true');
    }
    
    if (options?.audioSetting === 'off') {
        configParams.push('config.startWithAudioMuted=true');
    } else if (options?.audioSetting === 'on') {
        configParams.push('config.startWithAudioMuted=false');
    }
    
    if (options?.videoSetting === 'off') {
        configParams.push('config.startWithVideoMuted=true');
    } else if (options?.videoSetting === 'on') {
        configParams.push('config.startWithVideoMuted=false');
    }
    
    // Add custom config overrides
    if (options?.configOverrides) {
        options.configOverrides.forEach(override => {
            if (override.key.trim() && override.value.trim()) {
                configParams.push(`config.${override.key}=${encodeURIComponent(override.value)}`);
            }
        });
    }
    
    if (configParams.length > 0) {
        return `${baseUrl}#${configParams.join('&')}`;
    }
    
    return baseUrl;
}