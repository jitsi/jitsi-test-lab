import React, { useEffect, useRef, useState } from 'react';
import { 
    Box, 
    Paper, 
    Button, 
    Typography, 
    Chip,
    Stack,
    Divider,
    IconButton,
    Collapse
} from '@mui/material';
import { ExpandMore, ExpandLess, Close } from '@mui/icons-material';
import type { TabData } from '../contexts/TabsContext';
import { useTabsContext } from '../contexts/TabsContext';

interface TabContentProps {
    tab: TabData;
}

interface DeploymentInfo {
    releaseNumber?: string;
    shard?: string;
    userRegion?: string;
    jitsiMeetVersion?: string;
    libJitsiMeetVersion?: string;
    jicofoVersion?: string;
}

export const TabContent: React.FC<TabContentProps> = ({ tab }) => {
    const { updateTabConnectionState, useTabColors, closeTab, registerTabApi, unregisterTabApi, logApiEvent } = useTabsContext();
    const iframeContainerRef = useRef<HTMLDivElement>(null);
    const apiRef = useRef<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isConnected, setIsConnected] = useState(false);
    const [controlsExpanded, setControlsExpanded] = useState(false);
    const [deploymentInfo, setDeploymentInfo] = useState<DeploymentInfo>({});
    const [deploymentInfoExpanded, setDeploymentInfoExpanded] = useState(false);
    const [tokenInfoExpanded, setTokenInfoExpanded] = useState(false);
    const [connectionType, setConnectionType] = useState<'JVB' | 'P2P' | null>(null);

    // Function to decode JWT payload
    const decodeJwtPayload = (jwt: string) => {
        try {
            if (!jwt) return null;
            
            // JWT has three parts separated by dots: header.payload.signature
            const parts = jwt.split('.');
            if (parts.length !== 3) return null;
            
            // Decode the payload (second part)
            const payload = parts[1];
            // Add padding if needed for base64 decoding
            const paddedPayload = payload + '='.repeat((4 - payload.length % 4) % 4);
            const decoded = atob(paddedPayload.replace(/-/g, '+').replace(/_/g, '/'));
            
            return JSON.parse(decoded);
        } catch (error) {
            console.error('Error decoding JWT:', error);
            return null;
        }
    };

    // Message listener for deployment info response
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.data && event.data.type === 'jitsi_meet_external_api') {
                if (event.data.name === 'deployment-info-response' && event.data.deploymentInfo) {
                    console.log('Received deployment info response:', event.data.deploymentInfo);
                    const info = event.data.deploymentInfo;
                    setDeploymentInfo({
                        releaseNumber: info.releaseNumber,
                        shard: info.shard,
                        userRegion: info.userRegion
                    });
                }
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    // Function to get deployment info using the official Jitsi API method
    const getDeploymentInfo = async () => {
        console.log('Getting deployment info via official Jitsi API method...');
        if (apiRef.current) {
            try {
                const api = apiRef.current as any;
                
                // Use the official _getDeploymentInfo method
                if (typeof api._getDeploymentInfo === 'function') {
                    console.log('Using official _getDeploymentInfo method');
                    const deploymentInfo = await api._getDeploymentInfo();
                    console.log('Deployment info received:', deploymentInfo);
                    
                    if (deploymentInfo) {
                        setDeploymentInfo(prev => ({
                            ...prev,
                            releaseNumber: deploymentInfo.releaseNumber,
                            shard: deploymentInfo.shard,
                            userRegion: deploymentInfo.userRegion
                        }));
                    }
                } else {
                    console.log('_getDeploymentInfo method not available, trying manual approach');
                    
                    // Manual approach using the same pattern as the official method
                    const result = await api._transport.sendRequest({
                        name: 'deployment-info'
                    });
                    
                    console.log('Manual deployment info result:', result);
                    console.log('Result keys:', Object.keys(result || {}));
                    console.log('Has deploymentInfo?', !!(result && result.deploymentInfo));
                    
                    if (result) {
                        // Try different possible structures
                        let deploymentData = null;
                        
                        if (result.deploymentInfo) {
                            deploymentData = result.deploymentInfo;
                            console.log('Using result.deploymentInfo');
                        } else if (result.releaseNumber || result.shard || result.userRegion) {
                            deploymentData = result;
                            console.log('Using result directly');
                        }
                        
                        if (deploymentData) {
                            console.log('Setting deployment info:', deploymentData);
                            setDeploymentInfo(prev => ({
                                ...prev,
                                releaseNumber: deploymentData.releaseNumber,
                                shard: deploymentData.shard,
                                userRegion: deploymentData.userRegion
                            }));
                        } else {
                            console.log('No deployment data found in result');
                        }
                    }
                }
            } catch (error) {
                console.log('Error getting deployment info:', error);
            }
        }
    };

    // Function to parse version information from log messages
    const parseVersionFromLogs = (message: string) => {
        // Look for jicofo version: "Got focus version: 1.0.1155"
        const jicofoMatch = message.match(/Got focus version:\s*([^\s,]+)/i);
        if (jicofoMatch) {
            console.log('Found jicofo version:', jicofoMatch[1]);
            setDeploymentInfo(prev => ({
                ...prev,
                jicofoVersion: jicofoMatch[1]
            }));
            return;
        }

        // Look for lib-jitsi-meet version: "lib-jitsi-meet version: ccc06e83"
        const libJitsiMatch = message.match(/lib-jitsi-meet version:\s*([^\s,]+)/i);
        if (libJitsiMatch) {
            console.log('Found lib-jitsi-meet version:', libJitsiMatch[1]);
            setDeploymentInfo(prev => ({
                ...prev,
                libJitsiMeetVersion: libJitsiMatch[1]
            }));
            return;
        }

        // Look for jitsi-meet version (may appear in different log format)
        const jitsiMeetMatch = message.match(/jitsi-meet version:\s*([^\s,]+)/i);
        if (jitsiMeetMatch) {
            console.log('Found jitsi-meet version:', jitsiMeetMatch[1]);
            setDeploymentInfo(prev => ({
                ...prev,
                jitsiMeetVersion: jitsiMeetMatch[1]
            }));
            return;
        }

        // Debug: log any message that contains "version" to see what we're missing
        if (message.toLowerCase().includes('version')) {
            console.log('Version-related message found:', message);
        }
    };

    useEffect(() => {
        // Prevent multiple initializations
        if (apiRef.current) {
            console.log(`Tab ${tab.id}: API already initialized, skipping`);
            return;
        }

        let isComponentMounted = true;

        // Set initial state based on skipPrejoin
        const initialState = tab.skipPrejoin ? 'joining' : 'prejoin';
        updateTabConnectionState(tab.id, initialState);

        // Load Jitsi Meet External API script if not already loaded
        const loadJitsiAPI = async () => {
            // Check if this is a quick join tab
            const quickJoinOverride = tab.configOverrides?.find(override => override.key === '_quickJoinUrl');
            const isQuickJoin = !!quickJoinOverride;
            
            let scriptSrc = '';
            if (isQuickJoin) {
                // For quick join, extract domain from the URL
                try {
                    const url = new URL(quickJoinOverride!.value);
                    // Try standard Jitsi locations for external API
                    scriptSrc = `https://${url.hostname}/libs/external_api.min.js`;
                } catch (error) {
                    console.error('Failed to parse quick join URL:', error);
                    setIsLoading(false);
                    updateTabConnectionState(tab.id, 'error');
                    return;
                }
            } else {
                scriptSrc = `https://${tab.domain}/${tab.tenant}/libs/external_api.min.js`;
            }
            
            if (!(window as any).JitsiMeetExternalAPI) {
                const script = document.createElement('script');
                script.src = scriptSrc;
                script.onload = () => {
                    if (isComponentMounted) {
                        initializeJitsiMeet();
                    }
                };
                script.onerror = () => {
                    console.error('Failed to load Jitsi Meet External API from:', scriptSrc);
                    if (isComponentMounted) {
                        setIsLoading(false);
                        updateTabConnectionState(tab.id, 'error');
                    }
                };
                document.head.appendChild(script);
            } else {
                initializeJitsiMeet();
            }
        };

        const setupApiEventListeners = (api: any) => {
            // Subscribe to logs to capture version information
            api.on('log', (logEntry: any) => {
                if (logEntry && logEntry.args && Array.isArray(logEntry.args)) {
                    // Join all args to form the complete log message
                    const fullMessage = logEntry.args.join(' ');
                    parseVersionFromLogs(fullMessage);
                }
            });

            // Common events to log for iFrame Control
            const eventsToLog = [
                'videoConferenceJoined', 'videoConferenceLeft', 
                'participantJoined', 'participantLeft',
                'audioMuteStatusChanged', 'videoMuteStatusChanged',
                'audioAvailabilityChanged', 'videoAvailabilityChanged',
                'dominantSpeakerChanged', 'raiseHandUpdated', 'participantRoleChanged',
                'screenSharingStatusChanged', 'tileViewChanged', 'chatUpdated',
                'p2pStatusChanged', 'hangup', 'readyToClose'
            ];

            eventsToLog.forEach(eventName => {
                api.on(eventName, (data: any) => {
                    console.log(`Tab ${tab.id}: Logging API event: ${eventName}`, data);
                    logApiEvent(tab.id, eventName, data);
                });
            });

            // Set up event listeners
            api.on('videoConferenceJoined', () => {
                console.log(`Tab ${tab.id}: User joined the conference`);
                if (isComponentMounted) {
                    setIsConnected(true);
                    setIsLoading(false);
                    updateTabConnectionState(tab.id, 'joined');
                    // Set default connection type (most connections start with JVB)
                    setConnectionType('JVB');
                    // Request deployment info when connection is established
                    setTimeout(getDeploymentInfo, 1000); // Small delay to ensure API is ready
                    setTimeout(getDeploymentInfo, 3000); // Try again after 3 seconds
                    setTimeout(getDeploymentInfo, 5000); // And again after 5 seconds
                }
            });

            // Listen for P2P status changes
            api.on('p2pStatusChanged', (data: any) => {
                console.log(`Tab ${tab.id}: P2P status changed:`, data);
                if (isComponentMounted) {
                    setConnectionType(data.isP2p ? 'P2P' : 'JVB');
                }
            });

            api.on('videoConferenceLeft', () => {
                console.log(`Tab ${tab.id}: User left the conference`);
                if (isComponentMounted) {
                    setIsConnected(false);
                    setConnectionType(null);
                    updateTabConnectionState(tab.id, 'prejoin');
                }
            });

            // Listen for hangup to auto-close tab
            api.on('hangup', () => {
                console.log(`Tab ${tab.id}: Hangup detected, closing tab`);
                if (isComponentMounted) {
                    setTimeout(() => closeTab(tab.id), 1000); // Small delay to allow cleanup
                }
            });

            api.on('readyToClose', () => {
                console.log(`Tab ${tab.id}: Ready to close`);
            });

            // Listen for events that might contain deployment info
            api.on('deploymentInfoReceived', (info: any) => {
                console.log('deploymentInfoReceived event:', info);
                setDeploymentInfo({
                    releaseNumber: info.releaseNumber,
                    shard: info.shard,
                    userRegion: info.userRegion
                });
            });

            api.on('configReceived', (config: any) => {
                console.log('configReceived event:', config);
                if (config.deploymentInfo) {
                    console.log('Deployment info from configReceived:', config.deploymentInfo);
                    setDeploymentInfo({
                        releaseNumber: config.deploymentInfo.releaseNumber,
                        shard: config.deploymentInfo.shard,
                        userRegion: config.deploymentInfo.userRegion
                    });
                }
            });

            // Generic event listener for debugging
            api.on('*', (eventType: string, data: any) => {
                if (eventType.toLowerCase().includes('config') || eventType.toLowerCase().includes('deployment')) {
                    console.log(`Event ${eventType}:`, data);
                }
            });

            // Track additional states for better connection tracking
            api.on('participantJoined', (participant: any) => {
                if (participant.local && isComponentMounted) {
                    updateTabConnectionState(tab.id, 'joining');
                }
            });

            api.on('connectionFailed', () => {
                console.log(`Tab ${tab.id}: Connection failed`);
                if (isComponentMounted) {
                    updateTabConnectionState(tab.id, 'error');
                }
            });
        };

        const initializeJitsiMeet = () => {
            if (!iframeContainerRef.current || apiRef.current || !isComponentMounted) return;

            // Check for quick join URL
            const quickJoinOverride = tab.configOverrides?.find(override => override.key === '_quickJoinUrl');
            const isQuickJoin = !!quickJoinOverride;
            
            if (isQuickJoin) {
                console.log(`Tab ${tab.id}: Quick join with URL: ${quickJoinOverride?.value}`);
                
                // Parse the quick join URL to extract domain and room
                try {
                    const url = new URL(quickJoinOverride!.value);
                    const pathParts = url.pathname.split('/').filter(Boolean);
                    
                    // Use full pathname as room name to preserve tenant structure
                    // Remove leading slash and use full path (e.g. "tenant/conference")
                    const roomName = url.pathname.startsWith('/') ? url.pathname.slice(1) : url.pathname;
                    
                    // For quick join, we need to construct the API options differently
                    const JitsiMeetExternalAPI = (window as any).JitsiMeetExternalAPI;
                    
                    // Filter out the special _quickJoinUrl override from custom config overrides
                    const customOverrides = (tab.configOverrides || []).filter(override => 
                        override.key !== '_quickJoinUrl' && override.key.trim() && override.value.trim()
                    );

                    const options = {
                        roomName: roomName,
                        width: '100%',
                        height: '100%',
                        parentNode: iframeContainerRef.current,
                        // Pass JWT if it exists in the URL, or use tab JWT
                        jwt: url.searchParams.get('jwt') || tab.jwt || undefined,
                        configOverwrite: {
                            apiLogLevels: ['warn', 'log', 'error', 'info', 'debug'],
                            disableThirdPartyRequests: false,
                            enableDisplayNameInStats: true,
                            enableEmailInStats: true,
                            // Apply join settings from tab configuration
                            ...(tab.prejoinSetting === 'off' && {
                                prejoinConfig: {
                                    enabled: false
                                }
                            }),
                            ...(tab.prejoinSetting === 'on' && {
                                prejoinConfig: {
                                    enabled: true
                                }
                            }),
                            ...(tab.p2pSetting === 'off' && {
                                p2p: {
                                    enabled: false
                                }
                            }),
                            ...(tab.p2pSetting === 'on' && {
                                p2p: {
                                    enabled: true
                                }
                            }),
                            ...(tab.audioSetting === 'off' && {
                                startWithAudioMuted: true
                            }),
                            ...(tab.audioSetting === 'on' && {
                                startWithAudioMuted: false
                            }),
                            ...(tab.videoSetting === 'off' && {
                                startWithVideoMuted: true
                            }),
                            ...(tab.videoSetting === 'on' && {
                                startWithVideoMuted: false
                            }),
                            // Apply custom config overrides
                            ...(customOverrides.reduce((acc, override) => {
                                // Parse boolean and numeric values
                                let value: any = override.value.trim();
                                if (value === 'true') value = true;
                                else if (value === 'false') value = false;
                                else if (!isNaN(Number(value)) && value !== '') value = Number(value);
                                
                                acc[override.key.trim()] = value;
                                return acc;
                            }, {} as any))
                        },
                        userInfo: {
                            displayName: tab.displayName || 'Quick Join User'
                        }
                    };

                    const api = new JitsiMeetExternalAPI(url.hostname, options);
                    apiRef.current = api;
                    
                    // Register API for iFrame Control
                    registerTabApi(tab.id, api);
                    
                    // Set up all the same event listeners as normal tabs for deployment info
                    setupApiEventListeners(api);
                    
                    return;
                } catch (error) {
                    console.error('Failed to parse quick join URL:', error);
                    setIsLoading(false);
                    updateTabConnectionState(tab.id, 'error');
                    return;
                }
            }

            console.log(`Tab ${tab.id}: Initializing Jitsi Meet`);
            console.log(`Tab ${tab.id}: Using domain: ${tab.domain}, tenant: ${tab.tenant}, room: ${tab.room}`);
            
            try {
                const JitsiMeetExternalAPI = (window as any).JitsiMeetExternalAPI;
                
                const options = {
                    roomName: `${tab.tenant}/${tab.room}`,
                    width: '100%',
                    height: '100%',
                    parentNode: iframeContainerRef.current,
                    jwt: tab.jwt,
                    configOverwrite: {
                        apiLogLevels: ['warn', 'log', 'error', 'info', 'debug'],
                        disableThirdPartyRequests: false,
                        enableDisplayNameInStats: true,
                        enableEmailInStats: true,
                        // Try to override any width constraints
                        constraints: {
                            video: {
                                width: { ideal: 1920, max: 1920 },
                                height: { ideal: 1080, max: 1080 }
                            }
                        },
                        // Skip prejoin screen if requested (legacy)
                        ...(tab.skipPrejoin && {
                            prejoinConfig: {
                                enabled: false
                            }
                        }),
                        // Join options overrides
                        ...(tab.prejoinSetting === 'off' && {
                            prejoinConfig: {
                                enabled: false
                            }
                        }),
                        ...(tab.prejoinSetting === 'on' && {
                            prejoinConfig: {
                                enabled: true
                            }
                        }),
                        ...(tab.p2pSetting === 'off' && {
                            p2p: {
                                enabled: false
                            }
                        }),
                        ...(tab.p2pSetting === 'on' && {
                            p2p: {
                                enabled: true
                            }
                        }),
                        ...(tab.audioSetting === 'off' && {
                            startWithAudioMuted: true
                        }),
                        ...(tab.audioSetting === 'on' && {
                            startWithAudioMuted: false
                        }),
                        ...(tab.videoSetting === 'off' && {
                            startWithVideoMuted: true
                        }),
                        ...(tab.videoSetting === 'on' && {
                            startWithVideoMuted: false
                        }),
                        // Apply custom config overrides
                        ...(tab.configOverrides && tab.configOverrides.reduce((acc, override) => {
                            if (override.key.trim() && override.value.trim()) {
                                // Parse boolean and numeric values
                                let value: any = override.value.trim();
                                if (value === 'true') value = true;
                                else if (value === 'false') value = false;
                                else if (!isNaN(Number(value)) && value !== '') value = Number(value);
                                
                                acc[override.key.trim()] = value;
                            }
                            return acc;
                        }, {} as any))
                    },
                    interfaceConfigOverwrite: {
                        ENABLE_DIAL_OUT: true,
                        // Override interface width constraints
                        MAXIMUM_ZOOMING_COEFFICIENT: 5,
                        DISABLE_RESPONSIVE_MARGINS: true
                    },
                    userInfo: {
                        displayName: tab.displayName || 'Test User'
                    }
                };

                const api = new JitsiMeetExternalAPI(tab.domain, options);
                apiRef.current = api;

                // Register API for iFrame Control
                registerTabApi(tab.id, api);

                // Set up event listeners
                setupApiEventListeners(api);

                if (isComponentMounted) {
                    setIsLoading(false);
                }

            } catch (error) {
                console.error('Failed to initialize Jitsi Meet:', error);
                if (isComponentMounted) {
                    setIsLoading(false);
                    updateTabConnectionState(tab.id, 'error');
                }
            }
        };

        loadJitsiAPI();

        // Cleanup function
        return () => {
            isComponentMounted = false;
            
            if (apiRef.current) {
                console.log(`Tab ${tab.id}: Disposing Jitsi API`);
                try {
                    apiRef.current.dispose();
                } catch (error) {
                    console.error('Error disposing Jitsi API:', error);
                }
                apiRef.current = null;
            }
            
            // Unregister API from iFrame Control
            unregisterTabApi(tab.id);
            
            // Let React handle DOM cleanup naturally - don't manually clear innerHTML
            // The Jitsi API dispose() method should handle iframe cleanup
        };
    }, [tab.id]); // Only depend on tab.id to prevent re-initialization

    // Control functions based on index.ejs
    const startRecording = () => {
        if (apiRef.current) {
            apiRef.current.executeCommand('startRecording', { mode: 'file' });
        }
    };

    const stopRecording = () => {
        if (apiRef.current) {
            apiRef.current.executeCommand('stopRecording', 'file');
        }
    };

    const startLiveStreaming = () => {
        if (apiRef.current) {
            apiRef.current.executeCommand('startRecording', {
                mode: 'stream',
                youtubeStreamKey: '', // Would need to be configured
                shouldShare: true
            });
        }
    };

    const stopLiveStreaming = () => {
        if (apiRef.current) {
            apiRef.current.executeCommand('stopRecording', 'stream');
        }
    };

    const sendMessage = () => {
        if (apiRef.current) {
            apiRef.current.executeCommand('sendChatMessage', 'Hello from control panel!');
        }
    };

    const createBreakout = () => {
        if (apiRef.current) {
            const timestamp = new Date().toLocaleTimeString();
            apiRef.current.executeCommand('addBreakoutRoom', `Breakout Room ${timestamp}`);
        }
    };

    const toggleParticipantsPane = () => {
        if (apiRef.current) {
            apiRef.current.executeCommand('toggleParticipantsPane', true);
        }
    };

    const toggleSubtitles = () => {
        if (apiRef.current) {
            apiRef.current.executeCommand('toggleSubtitles');
        }
    };

    const dialout = () => {
        if (apiRef.current) {
            apiRef.current.invite([
                {
                    type: 'phone',
                    number: 'healthcheck'
                }
            ]);
        }
    };

    const followMe = () => {
        if (apiRef.current) {
            apiRef.current.executeCommand('setFollowMe', true);
        }
    };

    const unfollowMe = () => {
        if (apiRef.current) {
            apiRef.current.executeCommand('setFollowMe', false);
        }
    };

    const getRoleColor = (role?: string) => {
        switch (role) {
            case 'moderator': return 'success';
            case 'visitor': return 'warning';
            default: return 'default';
        }
    };

    return (
        <Box sx={{ 
            height: '100%', 
            width: '100%', 
            maxWidth: 'none',
            display: 'flex', 
            flexDirection: 'column'
        }}>
            {/* Control Area */}
            <Paper sx={{ 
                p: 2, 
                borderRadius: 0,
                ...(useTabColors && tab.color && {
                    background: `linear-gradient(135deg, ${tab.color}50, ${tab.color}25)`,
                    borderLeft: `6px solid ${tab.color}`,
                    borderTop: `2px solid ${tab.color}60`,
                    boxShadow: `0 0 10px ${tab.color}30`
                })
            }}>
                <Stack spacing={1}>
                    {/* Header Row */}
                    <Stack direction="row" spacing={2} alignItems="center">
                        <Typography variant="h6">
                            {tab.tabNumber ? `Tab ${tab.tabNumber}: ${tab.title}` : tab.title}
                        </Typography>
                        
                        <Stack direction="row" spacing={1}>
                            <Chip
                                label={tab.userRole?.toUpperCase() || 'REGULAR'}
                                color={getRoleColor(tab.userRole) as any}
                                size="small"
                            />
                            <Chip
                                label={isConnected ? 'CONNECTED' : 'CONNECTING'}
                                color={isConnected ? 'success' : 'default'}
                                variant="outlined"
                                size="small"
                            />
                            {isConnected && connectionType && (
                                <Chip
                                    label={connectionType}
                                    color={connectionType === 'P2P' ? 'primary' : 'secondary'}
                                    variant="outlined"
                                    size="small"
                                />
                            )}
                        </Stack>

                        <Box sx={{ flexGrow: 1 }} />

                        {/* Deployment Info Toggle */}
                        <Stack direction="row" alignItems="center" spacing={0.5}>
                            <Typography variant="caption" color="text.secondary">
                                Deployment Info
                            </Typography>
                            <IconButton
                                size="small"
                                onClick={() => setDeploymentInfoExpanded(!deploymentInfoExpanded)}
                                sx={{ 
                                    transition: 'transform 0.2s',
                                    transform: deploymentInfoExpanded ? 'rotate(180deg)' : 'rotate(0deg)'
                                }}
                                title="Show deployment and version info"
                            >
                                <ExpandMore />
                            </IconButton>
                        </Stack>

                        {/* Token Info Toggle */}
                        <Stack direction="row" alignItems="center" spacing={0.5}>
                            <Typography variant="caption" color="text.secondary">
                                Token Info
                            </Typography>
                            <IconButton
                                size="small"
                                onClick={() => setTokenInfoExpanded(!tokenInfoExpanded)}
                                sx={{ 
                                    transition: 'transform 0.2s',
                                    transform: tokenInfoExpanded ? 'rotate(180deg)' : 'rotate(0deg)'
                                }}
                                title="Show token information"
                            >
                                <ExpandMore />
                            </IconButton>
                        </Stack>

                        {/* API Controls Menu Toggle - Hidden for now */}
                        {false && (
                        <Stack direction="row" alignItems="center" spacing={0.5}>
                            <Typography variant="caption" color="text.secondary">
                                iFrame Functions
                            </Typography>
                            <IconButton
                                size="small"
                                onClick={() => setControlsExpanded(!controlsExpanded)}
                                sx={{ 
                                    transition: 'transform 0.2s',
                                    transform: controlsExpanded ? 'rotate(180deg)' : 'rotate(0deg)'
                                }}
                                title="Show API controls"
                            >
                                <ExpandMore />
                            </IconButton>
                        </Stack>
                        )}

                        {/* Close Tab Button */}
                        <IconButton
                            size="small"
                            onClick={() => closeTab(tab.id)}
                            sx={{ 
                                color: 'error.main',
                                '&:hover': {
                                    backgroundColor: 'error.light',
                                    color: 'error.contrastText'
                                }
                            }}
                            title="Close this tab"
                        >
                            <Close fontSize="small" />
                        </IconButton>
                    </Stack>

                    {/* Collapsible Deployment Info */}
                    <Collapse in={deploymentInfoExpanded}>
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ pt: 1 }}>
                            {/* Room and Domain Info */}
                            <Chip
                                label={`Room: ${tab.room}`}
                                variant="outlined"
                                size="small"
                                color="default"
                            />
                            <Chip
                                label={`Domain: ${tab.domain}`}
                                variant="outlined"
                                size="small"
                                color="default"
                            />
                            
                            {/* Deployment Info */}
                            {deploymentInfo.releaseNumber ? (
                                <Chip
                                    label={`Release: ${deploymentInfo.releaseNumber}`}
                                    variant="outlined"
                                    size="small"
                                    color="info"
                                />
                            ) : (
                                <Chip
                                    label="Release: Loading..."
                                    variant="outlined"
                                    size="small"
                                    color="default"
                                />
                            )}
                            {deploymentInfo.shard ? (
                                <Chip
                                    label={`Shard: ${deploymentInfo.shard}`}
                                    variant="outlined"
                                    size="small"
                                    color="secondary"
                                />
                            ) : (
                                <Chip
                                    label="Shard: Loading..."
                                    variant="outlined"
                                    size="small"
                                    color="default"
                                />
                            )}
                            {deploymentInfo.userRegion ? (
                                <Chip
                                    label={`User Region: ${deploymentInfo.userRegion}`}
                                    variant="outlined"
                                    size="small"
                                    color="default"
                                />
                            ) : (
                                <Chip
                                    label="User Region: Loading..."
                                    variant="outlined"
                                    size="small"
                                    color="default"
                                />
                            )}

                            {/* Version Info */}
                            {deploymentInfo.jitsiMeetVersion ? (
                                <Chip
                                    label={`JM: ${deploymentInfo.jitsiMeetVersion}`}
                                    variant="outlined"
                                    size="small"
                                    color="primary"
                                />
                            ) : (
                                <Chip
                                    label="JM: Loading..."
                                    variant="outlined"
                                    size="small"
                                    color="default"
                                />
                            )}
                            {deploymentInfo.libJitsiMeetVersion ? (
                                <Chip
                                    label={`LJM: ${deploymentInfo.libJitsiMeetVersion}`}
                                    variant="outlined"
                                    size="small"
                                    color="primary"
                                />
                            ) : (
                                <Chip
                                    label="LJM: Loading..."
                                    variant="outlined"
                                    size="small"
                                    color="default"
                                />
                            )}
                            {deploymentInfo.jicofoVersion ? (
                                <Chip
                                    label={`Jicofo: ${deploymentInfo.jicofoVersion}`}
                                    variant="outlined"
                                    size="small"
                                    color="primary"
                                />
                            ) : (
                                <Chip
                                    label="Jicofo: Loading..."
                                    variant="outlined"
                                    size="small"
                                    color="default"
                                />
                            )}
                        </Stack>
                    </Collapse>

                    {/* Collapsible Token Info */}
                    <Collapse in={tokenInfoExpanded}>
                        <Stack direction="column" spacing={1} sx={{ pt: 1 }}>
                            {tab.jwt ? (
                                <Paper sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                                    <Typography variant="caption" color="text.secondary" gutterBottom>
                                        JWT Token Payload:
                                    </Typography>
                                    <Box component="pre" sx={{ 
                                        fontFamily: 'monospace', 
                                        fontSize: '0.75rem',
                                        margin: 0,
                                        whiteSpace: 'pre-wrap',
                                        wordBreak: 'break-all',
                                        maxHeight: '200px',
                                        overflow: 'auto',
                                        color: 'text.primary'
                                    }}>
                                        {JSON.stringify(decodeJwtPayload(tab.jwt), null, 2)}
                                    </Box>
                                </Paper>
                            ) : (
                                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                    No token available for this tab
                                </Typography>
                            )}
                        </Stack>
                    </Collapse>

                    {/* Collapsible Control Buttons - Hidden for now */}
                    {false && (
                    <Collapse in={controlsExpanded}>
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ pt: 1 }}>
                            {/* Recording Controls */}
                            <Button 
                                variant="outlined" 
                                size="small"
                                onClick={startRecording}
                                disabled={!isConnected}
                            >
                                Start Recording
                            </Button>
                            <Button 
                                variant="outlined" 
                                size="small"
                                onClick={stopRecording}
                                disabled={!isConnected}
                            >
                                Stop Recording
                            </Button>

                            {/* Streaming Controls */}
                            <Button 
                                variant="outlined" 
                                size="small"
                                onClick={startLiveStreaming}
                                disabled={!isConnected}
                            >
                                Start Livestream
                            </Button>
                            <Button 
                                variant="outlined" 
                                size="small"
                                onClick={stopLiveStreaming}
                                disabled={!isConnected}
                            >
                                Stop Livestream
                            </Button>

                            <Divider orientation="vertical" flexItem />

                            {/* Communication Controls */}
                            <Button 
                                variant="outlined" 
                                size="small"
                                onClick={sendMessage}
                                disabled={!isConnected}
                            >
                                Send Message
                            </Button>
                            <Button 
                                variant="outlined" 
                                size="small"
                                onClick={toggleParticipantsPane}
                                disabled={!isConnected}
                            >
                                Toggle Participants
                            </Button>

                            {/* Meeting Controls */}
                            <Button 
                                variant="outlined" 
                                size="small"
                                onClick={createBreakout}
                                disabled={!isConnected}
                            >
                                Create Breakout
                            </Button>
                            <Button 
                                variant="outlined" 
                                size="small"
                                onClick={toggleSubtitles}
                                disabled={!isConnected}
                            >
                                Toggle Subtitles
                            </Button>

                            <Divider orientation="vertical" flexItem />

                            {/* Moderator Controls */}
                            <Button 
                                variant="outlined" 
                                size="small"
                                onClick={followMe}
                                disabled={!isConnected}
                            >
                                Follow Me
                            </Button>
                            <Button 
                                variant="outlined" 
                                size="small"
                                onClick={unfollowMe}
                                disabled={!isConnected}
                            >
                                Unfollow Me
                            </Button>
                            <Button 
                                variant="outlined" 
                                size="small"
                                onClick={dialout}
                                disabled={!isConnected}
                            >
                                Dialout
                            </Button>
                        </Stack>
                    </Collapse>
                    )}
                </Stack>
            </Paper>

            {/* Iframe Container */}
            <Box 
                ref={iframeContainerRef}
                sx={{ 
                    flexGrow: 1, 
                    width: '100%',
                    minHeight: 400,
                    position: 'relative',
                    bgcolor: '#000',
                    display: 'block',
                    overflow: 'hidden',
                    '& iframe': {
                        width: '100% !important',
                        height: '100% !important',
                        border: 'none',
                        display: 'block'
                    }
                }}
            >
                {isLoading && (
                    <Typography color="white" variant="h6">
                        Loading meeting...
                    </Typography>
                )}
            </Box>
        </Box>
    );
};