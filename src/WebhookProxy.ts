import {logInfo} from "./browserLogger";

// Interface for structured log entries
export interface WebhookLogEntry {
    id: string;
    timestamp: Date;
    eventName: string;
    data: any;
}

// Global connection registry to prevent duplicates
const activeConnections = new Map<string, WebhookProxy>();

class WebhookProxy {
    private readonly url;
    private readonly secret;
    private readonly conferenceName;
    private readonly tenant;
    private ws: WebSocket | undefined;
    private cache = new Map();
    private listeners = new Map();
    private consumers = new Map();
    private _defaultMeetingSettings: IMeetingSettings | undefined;
    private logs: WebhookLogEntry[] = [];
    private isConnecting: boolean = false;
    private isConnected: boolean = false;

    constructor(url: string, secret: string, conferenceName: string, tenant: string) {
        this.url = url;
        this.secret = secret;
        this.conferenceName = conferenceName;
        this.tenant = tenant;
    }

    static getInstance(url: string, secret: string, conferenceName: string, tenant: string): WebhookProxy {
        const key = `${url}_${tenant}_${conferenceName}`;
        
        if (activeConnections.has(key)) {
            const existingProxy = activeConnections.get(key)!;
            console.log(`🔄 Reusing existing WebhookProxy for ${tenant}/${conferenceName}`);
            return existingProxy;
        }
        
        console.log(`🆕 Creating new WebhookProxy for ${tenant}/${conferenceName}`);
        const newProxy = new WebhookProxy(url, secret, conferenceName, tenant);
        activeConnections.set(key, newProxy);
        return newProxy;
    }

    connect() {
        // Prevent duplicate connections
        if (this.isConnecting || this.isConnected) {
            console.log(`⚠️ WebhookProxy for ${this.conferenceName} already connecting/connected`);
            return;
        }
        
        this.isConnecting = true;
        
        // Connect directly to remote proxy server with secret parameter
        const remoteProxyUrl = `${this.url}?secret=${encodeURIComponent(this.secret)}&tenant=${encodeURIComponent(this.tenant)}&room=${encodeURIComponent(this.conferenceName)}`;
        
        console.log(`Connecting directly to remote proxy: ${remoteProxyUrl}`);
        this.ws = new WebSocket(remoteProxyUrl);
        
        this.logInfo('connecting', { room: `${this.tenant}/${this.conferenceName}`, type: 'direct' });

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            this.logInfo('websocket_error', { error: 'connection_failed' });
        };

        this.ws.onopen = () => {
            console.log(`WebhookProxy connected directly to remote proxy for ${this.tenant}/${this.conferenceName}`);
            this.logInfo('connected', { type: 'direct_proxy' });
            this.isConnecting = false;
            this.isConnected = true;
            
            // Subscribe to room events after connection is established
            this.subscribeToRoom();
        };

        this.ws.onclose = () => {
            console.log(`WebhookProxy disconnected for ${this.conferenceName}`);
            this.logInfo('websocket_closed', { reason: 'connection_closed' });
            this.isConnecting = false;
            this.isConnected = false;
        };

        this.ws.onmessage = async (event) => {
            console.log(`📥 Raw WebSocket message received [${this.conferenceName}]:`, event.data);
            
            let dataStr;
            if (event.data instanceof Blob) {
                dataStr = await event.data.text();
                console.log(`📥 Blob converted to text [${this.conferenceName}]:`, dataStr);
            } else {
                dataStr = event.data;
            }
            
            const msg = JSON.parse(dataStr);
            
            // Handle subscription confirmation and other system messages
            if (msg.type === 'subscription-confirmed') {
                this.logInfo('subscription_confirmed', { room: msg.conference || this.conferenceName });
                return;
            } else if (msg.type === 'subscription-error') {
                this.logInfo('subscription_error', { error: msg.error || 'Unknown error' });
                return;
            } else if (msg.type) {
                // Handle other system messages
                this.logInfo('system_message', { messageType: msg.type, data: msg });
                return;
            }
            
            this.logInfo(msg.eventType || 'unknown_event', { webhook_data: msg });

            if (msg.eventType) {
                let processed = false;

                if (this.consumers.has(msg.eventType)) {
                    this.consumers.get(msg.eventType)(msg);
                    this.consumers.delete(msg.eventType);
                    processed = true;
                } else {
                    this.cache.set(msg.eventType, msg);
                }

                if (this.listeners.has(msg.eventType)) {
                    this.listeners.get(msg.eventType)(msg);
                    processed = true;
                }

                if (!processed && msg.eventType === 'SETTINGS_PROVISIONING') {
                    let response: any = { someField: 'someValue' };

                    if (this._defaultMeetingSettings) {
                        response = this._defaultMeetingSettings;
                    }
                    this.logInfo('settings_provisioning_response', { response });

                    this.ws?.send(JSON.stringify(response));
                }
            }
        };
    }

    subscribeToRoom() {
        if (!this.ws) {
            this.logInfo('subscription_failed', { reason: 'websocket_not_connected' });
            return;
        }
        
        const subscriptionMessage = {
            type: 'subscribe',
            conference: this.conferenceName
        };
        
        this.logInfo('subscribing', { room: this.conferenceName });
        console.log(`📤 Sending room subscription for ${this.conferenceName}:`, subscriptionMessage);
        
        this.ws.send(JSON.stringify(subscriptionMessage));
    }

    addConsumer(eventType: string, callback: (data: any) => void) {
        if (this.cache.has(eventType)) {
            callback(this.cache.get(eventType));
            this.cache.delete(eventType);
            return;
        }

        this.consumers.set(eventType, callback);
    }

    clearCache() {
        this.logInfo('cache_cleared', {});
        this.cache.clear();
    }

    async waitForEvent(eventType: string, timeout = 4000): Promise<any> {
        const error = new Error(`Timeout waiting for event:${eventType}`);

        return new Promise((resolve, reject) => {
            const waiter = setTimeout(() => {
                this.logInfo('subscription_error', { error: error.message });
                return reject(error);
            }, timeout);

            this.addConsumer(eventType, event => {
                clearTimeout(waiter);
                resolve(event);
            });
        });
    }

    addListener(eventType: string, callback: (data: any) => void) {
        this.listeners.set(eventType, callback);
    }

    removeListener(eventType: string) {
        this.listeners.delete(eventType);
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
            console.log('WebhookProxy disconnected');
            this.ws = undefined;
            this.logInfo('disconnected', {});
            this.isConnecting = false;
            this.isConnected = false;
        }
    }

    logInfo(eventName: string, data: any = {}) {
        const logEntry: WebhookLogEntry = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            timestamp: new Date(),
            eventName: eventName,
            data: { conference: this.conferenceName, ...data }
        };
        
        const messageString = `[${this.conferenceName}] ${eventName}: ${JSON.stringify(data)}`;
        console.log(messageString);
        this.logs.push(logEntry);
        
        // Keep only last 1000 log entries to prevent memory issues
        if (this.logs.length > 1000) {
            this.logs = this.logs.slice(-1000);
        }
    }

    getLogs(): WebhookLogEntry[] {
        return [...this.logs];
    }

    clearLogs() {
        this.logs = [];
    }

    set defaultMeetingSettings(value: IMeetingSettings) {
        console.log('Default meeting settings set to:', value);
        this._defaultMeetingSettings = value;
    }

    get defaultMeetingSettings(): IMeetingSettings | undefined {
        return this._defaultMeetingSettings;
    }

    get connectionStatus(): 'connected' | 'connecting' | 'disconnected' {
        if (this.isConnected) return 'connected';
        if (this.isConnecting) return 'connecting';
        return 'disconnected';
    }
}

export interface IMeetingSettings {
    autoAudioRecording?: boolean;
    autoTranscriptions?: boolean;
    autoVideoRecording?: boolean;
    lobbyEnabled?: boolean;
    lobbyType?: 'WAIT_FOR_APPROVAL' | 'WAIT_FOR_MODERATOR';
    maxOccupants?: number;
    outboundPhoneNo?: string;
    participantsSoftLimit?: number;
    passcode?: string;
    transcriberType?: 'GOOGLE' | 'ORACLE_CLOUD_AI_SPEECH' | 'EGHT_WHISPER';
    visitorsEnabled?: boolean;
    visitorsLive?: boolean;
}

export default WebhookProxy;
