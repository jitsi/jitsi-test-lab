import React, { useState, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    TextField,
    FormControlLabel,
    Switch,
    Button,
    Alert,
    Chip,
    Stack,
    Divider,
    IconButton,
    Snackbar,
    ToggleButtonGroup,
    ToggleButton,
    Collapse,
    Checkbox,
    FormGroup,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions
} from '@mui/material';
import { ContentCopy as CopyIcon, Link as LinkIcon, Tab as TabIcon, PlayArrow as SwitchIcon, SkipNext as SkipIcon, OpenInNew as OpenInNewIcon, ExpandMore, Add as AddIcon, Remove as RemoveIcon, Launch as QuickJoinIcon } from '@mui/icons-material';
// Removed useNavigate import - navigation handled by parent
import { useAppContext } from '../App';
import { useTabsContext } from '../contexts/TabsContext';
import { generateJwt, generateConferenceLink, generatePayload } from '../utils/tokenGenerator';
import type { TokenOptions } from '../utils/tokenGenerator';
import { v4 as uuidv4 } from 'uuid';

type TokenMode = 'generate' | 'none' | 'external';

export function TokensPage() {
    const { 
        config, 
        currentConference, setCurrentConference,
        prejoinScreen, setPrejoinScreen,
        p2pSetting, setP2pSetting,
        audioSetting, setAudioSetting,
        videoSetting, setVideoSetting,
        displayName, setDisplayName,
        expiration, setExpiration,
        moderator, setModerator,
        visitor, setVisitor
    } = useAppContext();
    const { addTab, addTabBackground, setActiveTab } = useTabsContext();
    // const navigate = useNavigate(); // Removed - no navigation needed
    const [generatedJwt, setGeneratedJwt] = useState<string>('');
    const [error, setError] = useState<string>('');
    const [copySuccess, setCopySuccess] = useState<string>('');
    const [payloadExpanded, setPayloadExpanded] = useState<boolean>(false);
    const [permissionsExpanded, setPermissionsExpanded] = useState<boolean>(false);
    const [configOverridesExpanded, setConfigOverridesExpanded] = useState<boolean>(false);
    
    // Token mode state
    const [tokenMode, setTokenMode] = useState<TokenMode>(() => {
        try {
            return (localStorage.getItem('participants-token-mode') as TokenMode) || 'generate';
        } catch {
            return 'generate';
        }
    });
    const [externalJwt, setExternalJwt] = useState<string>(() => {
        try {
            return localStorage.getItem('participants-external-jwt') || '';
        } catch {
            return '';
        }
    });
    
    // Quick join state
    const [quickJoinDialogOpen, setQuickJoinDialogOpen] = useState(false);
    const [quickJoinUrl, setQuickJoinUrl] = useState('');
    const [quickJoinUseToken, setQuickJoinUseToken] = useState(false);
    const [quickJoinApplyConfig, setQuickJoinApplyConfig] = useState(false);
    
    // Custom config overrides state
    const [configOverrides, setConfigOverrides] = useState<Array<{key: string, value: string, id: string}>>([
        { key: '', value: '', id: uuidv4() }
    ]);
    
    // JWT Permissions state
    const [permissions, setPermissions] = useState({
        livestreaming: false,
        recording: false,
        transcription: false,
        'sip-inbound-call': false,
        'sip-outbound-call': false,
        'inbound-call': false,
        'outbound-call': false,
        'file-upload': false,
        'list-visitors': false,
        'send-groupchat': false,
        'create-polls': false,
        'hidden-from-recorder': false
    });
    
    const handlePermissionChange = (permission: string, checked: boolean) => {
        setPermissions(prev => ({ ...prev, [permission]: checked }));
    };
    
    const addConfigOverride = () => {
        setConfigOverrides(prev => [...prev, { key: '', value: '', id: uuidv4() }]);
    };
    
    const removeConfigOverride = (id: string) => {
        setConfigOverrides(prev => prev.filter(item => item.id !== id));
    };
    
    const updateConfigOverride = (id: string, field: 'key' | 'value', newValue: string) => {
        setConfigOverrides(prev => prev.map(item => 
            item.id === id ? { ...item, [field]: newValue } : item
        ));
    };
    
    // Token mode handlers
    const handleTokenModeChange = (newMode: TokenMode | null) => {
        if (!newMode) return;
        setTokenMode(newMode);
        try {
            localStorage.setItem('participants-token-mode', newMode);
        } catch (error) {
            console.error('Failed to save token mode to localStorage:', error);
        }
    };
    
    const handleExternalJwtChange = (value: string) => {
        setExternalJwt(value);
        try {
            localStorage.setItem('participants-external-jwt', value);
        } catch (error) {
            console.error('Failed to save external JWT to localStorage:', error);
        }
    };

    // Create tokenOptions object from context state
    const tokenOptions: TokenOptions = {
        displayName,
        exp: expiration,
        keyId: config?.kid || '',
        privateKey: config?.privateKey || '',
        moderator,
        room: currentConference || '*',
        visitor,
        permissions: permissions
    };


    // Get the effective JWT based on token mode
    const getEffectiveJwt = () => {
        switch (tokenMode) {
            case 'generate':
                return generatedJwt;
            case 'external':
                return externalJwt;
            case 'none':
                return '';
            default:
                return generatedJwt;
        }
    };

    // Re-generate token whenever options change (only when in generate mode)
    useEffect(() => {
        if (tokenMode !== 'generate') {
            setGeneratedJwt('');
            return;
        }
        
        const generateTokenAsync = async () => {
            if (tokenOptions.keyId && tokenOptions.privateKey) {
                try {
                    const jwt = await generateJwt(tokenOptions);
                    setGeneratedJwt(jwt);
                    setError('');
                } catch (err) {
                    console.error('Token generation error:', err);
                    setError(err instanceof Error ? err.message : 'Failed to generate token');
                    setGeneratedJwt('');
                }
            } else {
                setGeneratedJwt('');
            }
        };
        
        generateTokenAsync();
    }, [tokenMode, displayName, expiration, config?.kid, config?.privateKey, moderator, currentConference, visitor, permissions]);


    const copyToClipboard = async (text: string, successMessage: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopySuccess(successMessage);
        } catch (err) {
            setCopySuccess('Failed to copy to clipboard');
        }
    };

    const copyJwt = () => {
        const effectiveJwt = getEffectiveJwt();
        copyToClipboard(effectiveJwt, 'JWT copied to clipboard!');
    };

    const copyPayload = () => {
        if (!config || tokenMode !== 'generate') return;
        const payload = generatePayload(tokenOptions);
        copyToClipboard(JSON.stringify(payload, null, 2), 'Payload copied to clipboard!');
    };

    const copyConferenceLink = () => {
        if (!config) return;
        
        const roomName = currentConference || 'test-room';
        const validOverrides = configOverrides.filter(item => item.key.trim() && item.value.trim());
        const effectiveJwt = getEffectiveJwt();
        const link = generateConferenceLink(config.domain, config.tenant, roomName || 'test-room', effectiveJwt, {
            prejoinScreen: prejoinScreen,
            p2pSetting: p2pSetting,
            audioSetting: audioSetting,
            videoSetting: videoSetting,
            configOverrides: validOverrides
        });
        copyToClipboard(link, 'Conference link copied to clipboard!');
    };

    const openConferenceLink = () => {
        if (!config) return;
        
        const roomName = currentConference || 'test-room';
        const validOverrides = configOverrides.filter(item => item.key.trim() && item.value.trim());
        const effectiveJwt = getEffectiveJwt();
        const link = generateConferenceLink(config.domain, config.tenant, roomName || 'test-room', effectiveJwt, {
            prejoinScreen: prejoinScreen,
            p2pSetting: p2pSetting,
            audioSetting: audioSetting,
            videoSetting: videoSetting,
            configOverrides: validOverrides
        });
        window.open(link, '_blank');
        setCopySuccess('Conference link opened in new tab!');
    };

    const handleOpenMeetingTab = () => {
        if (prejoinScreen === 'off') {
            addNewTabAndSwitchSkipPrejoin();
        } else {
            addNewTabAndSwitch();
        }
    };


    const addNewTabAndSwitch = () => {
        if (!config) return;
        
        console.log('Creating tab with config domain:', config.domain, 'tenant:', config.tenant);
        
        const roomName = currentConference || 'test-room';
        const validOverrides = configOverrides.filter(item => item.key.trim() && item.value.trim());
        const effectiveJwt = getEffectiveJwt();
        const tabTitle = `${displayName || 'User'} - ${roomName || 'test-room'}`;
        
        const newTabId = addTab({
            title: tabTitle,
            jwt: effectiveJwt,
            domain: config.domain,
            tenant: config.tenant,
            room: roomName || 'test-room',
            displayName: displayName,
            userRole: moderator ? 'moderator' : visitor ? 'visitor' : 'regular',
            skipPrejoin: false,
            prejoinSetting: prejoinScreen,
            p2pSetting: p2pSetting,
            audioSetting: audioSetting,
            videoSetting: videoSetting,
            configOverrides: validOverrides
        });
        
        // Navigate to tabs page to show the new tab
        // Navigation removed - staying on same URL
        setCopySuccess('Tab opened!');
    };


    const addNewTabAndSwitchSkipPrejoin = () => {
        if (!config) return;
        
        console.log('Creating skip-prejoin tab with config domain:', config.domain, 'tenant:', config.tenant);
        
        const roomName = currentConference || 'test-room';
        const validOverrides = configOverrides.filter(item => item.key.trim() && item.value.trim());
        const effectiveJwt = getEffectiveJwt();
        const tabTitle = `${displayName || 'User'} - ${roomName || 'test-room'}`;
        
        const newTabId = addTab({
            title: tabTitle,
            jwt: effectiveJwt,
            domain: config.domain,
            tenant: config.tenant,
            room: roomName || 'test-room',
            displayName: displayName,
            userRole: moderator ? 'moderator' : visitor ? 'visitor' : 'regular',
            skipPrejoin: true,
            prejoinSetting: prejoinScreen,
            p2pSetting: p2pSetting,
            audioSetting: audioSetting,
            videoSetting: videoSetting,
            configOverrides: validOverrides
        });
        
        // Navigate to tabs page to show the new tab
        // Navigation removed - staying on same URL
        setCopySuccess('Tab opened!');
    };

    const handleCloseCopySuccess = () => {
        setCopySuccess('');
    };

    const handleQuickJoinClick = () => {
        setQuickJoinUrl('');
        setQuickJoinUseToken(false);
        setQuickJoinApplyConfig(false);
        setQuickJoinDialogOpen(true);
    };

    const handleQuickJoin = () => {
        if (!quickJoinUrl.trim()) {
            return;
        }

        let finalUrl = quickJoinUrl.trim();
        
        // Add token if requested and available
        if (quickJoinUseToken) {
            const effectiveJwt = getEffectiveJwt();
            if (effectiveJwt) {
                const separator = finalUrl.includes('?') ? '&' : '?';
                finalUrl = `${finalUrl}${separator}jwt=${encodeURIComponent(effectiveJwt)}`;
            }
        }

        // Parse URL to get domain and room info for tab title
        let tabTitle = 'Quick Join';
        try {
            const url = new URL(finalUrl);
            const pathParts = url.pathname.split('/').filter(Boolean);
            const roomName = pathParts[pathParts.length - 1] || 'Unknown Room';
            const tokenLabel = quickJoinUseToken && getEffectiveJwt() ? ' (with token)' : ' (no token)';
            tabTitle = `Quick Join - ${roomName}${tokenLabel}`;
        } catch (error) {
            // If URL parsing fails, use the original title
        }

        // Prepare config overrides - always include the quick join URL
        const quickJoinOverrides = [{ key: '_quickJoinUrl', value: finalUrl, id: uuidv4() }];
        
        // Add custom config overrides if apply config is checked
        if (quickJoinApplyConfig) {
            const validOverrides = configOverrides.filter(item => item.key.trim() && item.value.trim());
            quickJoinOverrides.push(...validOverrides);
        }

        // Create a special tab for quick join
        const newTabId = addTab({
            title: tabTitle,
            jwt: quickJoinUseToken ? getEffectiveJwt() : '',
            domain: '', // Will be extracted from the URL in TabContent
            tenant: '',
            room: '', // Will be extracted from the URL in TabContent
            displayName: displayName || 'Quick Join User',
            userRole: 'regular',
            skipPrejoin: false,
            // Apply join options if config is enabled
            prejoinSetting: quickJoinApplyConfig ? prejoinScreen : 'default',
            p2pSetting: quickJoinApplyConfig ? p2pSetting : 'default',
            audioSetting: quickJoinApplyConfig ? audioSetting : 'default',
            videoSetting: quickJoinApplyConfig ? videoSetting : 'default',
            configOverrides: quickJoinOverrides
        });
        
        // Navigation removed - staying on same URL
        setCopySuccess('Quick join tab opened!');
        setQuickJoinDialogOpen(false);
    };

    return (
        <Box sx={{ maxWidth: 800, mx: 'auto', height: '100%', overflow: 'auto', p: 3 }}>
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Participant Configuration
                    </Typography>
                    
                    <Box sx={{ mb: 3 }}>
                        <Typography variant="subtitle2" gutterBottom>
                            Token Mode
                        </Typography>
                        <ToggleButtonGroup
                            value={tokenMode}
                            exclusive
                            onChange={(e, value) => handleTokenModeChange(value)}
                            size="small"
                            sx={{ 
                                '& .MuiToggleButton-root': { 
                                    px: 2,
                                    py: 1,
                                    '&.Mui-selected': {
                                        backgroundColor: 'primary.main',
                                        color: 'primary.contrastText',
                                        '&:hover': {
                                            backgroundColor: 'primary.dark',
                                        }
                                    }
                                }
                            }}
                        >
                            <ToggleButton value="generate" disabled={!config?.kid || !config?.privateKey}>
                                Generate Token
                                {(!config?.kid || !config?.privateKey) && ' (No Auth Config)'}
                            </ToggleButton>
                            <ToggleButton value="none">No Token</ToggleButton>
                            <ToggleButton value="external">External Token</ToggleButton>
                        </ToggleButtonGroup>
                    </Box>
                    
                    {(!config?.kid || !config?.privateKey) && (
                        <Alert severity="info" sx={{ mb: 2 }}>
                            No authentication configuration found. The app will use public Jitsi Meet mode without JWT tokens. 
                            To use JaaS authentication, configure the Key ID and Private Key in Environment Config.
                        </Alert>
                    )}
                    
                    {tokenMode === 'external' && (
                        <Box sx={{ mb: 3 }}>
                            <TextField
                                label="External JWT"
                                value={externalJwt}
                                onChange={(e) => handleExternalJwtChange(e.target.value)}
                                placeholder="Paste your JWT token here..."
                                multiline
                                rows={3}
                                fullWidth
                                sx={{ fontFamily: 'monospace' }}
                            />
                        </Box>
                    )}
                    
                    {tokenMode === 'generate' && (
                    <Stack spacing={3}>
                        <Stack direction="row" spacing={2}>
                            <TextField
                                label="Display Name"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                sx={{ flex: 1 }}
                            />
                            <TextField
                                label="Room"
                                value={currentConference || '*'}
                                onChange={(e) => setCurrentConference(e.target.value)}
                                placeholder="* for all rooms"
                                sx={{ flex: 1 }}
                            />
                            <TextField
                                label="Expiration"
                                value={expiration}
                                onChange={(e) => setExpiration(e.target.value)}
                                placeholder="e.g., 1h, 24h"
                                sx={{ flex: 0.8 }}
                            />
                        </Stack>
                        
                        {/* Subject, Key ID and Private Key are loaded from config and not shown in UI */}
                        
                        <Box>
                            <Typography variant="subtitle2" gutterBottom>
                                User Role
                            </Typography>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={moderator}
                                        onChange={(e) => {
                                            setModerator(e.target.checked);
                                            if (e.target.checked) {
                                                setVisitor(false);
                                            }
                                        }}
                                    />
                                }
                                label="Moderator"
                            />
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={visitor}
                                        onChange={(e) => {
                                            setVisitor(e.target.checked);
                                            if (e.target.checked) {
                                                setModerator(false);
                                            }
                                        }}
                                    />
                                }
                                label="Visitor"
                            />
                        </Box>
                        
                        {/* Permissions Section */}
                        <Box>
                            <Stack direction="row" alignItems="center" spacing={0.5}>
                                <Typography variant="subtitle2">
                                    Permissions
                                </Typography>
                                <IconButton
                                    size="small"
                                    onClick={() => setPermissionsExpanded(!permissionsExpanded)}
                                    sx={{ 
                                        transition: 'transform 0.2s',
                                        transform: permissionsExpanded ? 'rotate(180deg)' : 'rotate(0deg)'
                                    }}
                                    title="Configure JWT permissions"
                                >
                                    <ExpandMore fontSize="small" />
                                </IconButton>
                            </Stack>
                            
                            <Collapse in={permissionsExpanded}>
                                <Box sx={{ 
                                    mt: 1,
                                    p: 2,
                                    bgcolor: 'grey.50',
                                    borderRadius: 1,
                                    border: '1px solid',
                                    borderColor: 'grey.200'
                                }}>
                                    <FormGroup>
                                        <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                                            Meeting Features
                                        </Typography>
                                        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1 }}>
                                            <Tooltip title="Allow livestreaming the meeting">
                                                <FormControlLabel
                                                    control={
                                                        <Checkbox
                                                            size="small"
                                                            checked={permissions.livestreaming}
                                                            onChange={(e) => handlePermissionChange('livestreaming', e.target.checked)}
                                                        />
                                                    }
                                                    label="Livestreaming"
                                                />
                                            </Tooltip>
                                            <Tooltip title="Allow recording the meeting">
                                                <FormControlLabel
                                                    control={
                                                        <Checkbox
                                                            size="small"
                                                            checked={permissions.recording}
                                                            onChange={(e) => handlePermissionChange('recording', e.target.checked)}
                                                        />
                                                    }
                                                    label="Recording"
                                                />
                                            </Tooltip>
                                            <Tooltip title="Enable meeting transcription">
                                                <FormControlLabel
                                                    control={
                                                        <Checkbox
                                                            size="small"
                                                            checked={permissions.transcription}
                                                            onChange={(e) => handlePermissionChange('transcription', e.target.checked)}
                                                        />
                                                    }
                                                    label="Transcription"
                                                />
                                            </Tooltip>
                                            <Tooltip title="Allow file uploads during the meeting">
                                                <FormControlLabel
                                                    control={
                                                        <Checkbox
                                                            size="small"
                                                            checked={permissions['file-upload']}
                                                            onChange={(e) => handlePermissionChange('file-upload', e.target.checked)}
                                                        />
                                                    }
                                                    label="File Upload"
                                                />
                                            </Tooltip>
                                        </Box>
                                        
                                        <Typography variant="caption" color="text.secondary" sx={{ mt: 2, mb: 1, display: 'block' }}>
                                            Communication
                                        </Typography>
                                        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1 }}>
                                            <Tooltip title="Send messages in group chat">
                                                <FormControlLabel
                                                    control={
                                                        <Checkbox
                                                            size="small"
                                                            checked={permissions['send-groupchat']}
                                                            onChange={(e) => handlePermissionChange('send-groupchat', e.target.checked)}
                                                        />
                                                    }
                                                    label="Group Chat"
                                                />
                                            </Tooltip>
                                            <Tooltip title="Create polls during the meeting">
                                                <FormControlLabel
                                                    control={
                                                        <Checkbox
                                                            size="small"
                                                            checked={permissions['create-polls']}
                                                            onChange={(e) => handlePermissionChange('create-polls', e.target.checked)}
                                                        />
                                                    }
                                                    label="Create Polls"
                                                />
                                            </Tooltip>
                                        </Box>
                                        
                                        <Typography variant="caption" color="text.secondary" sx={{ mt: 2, mb: 1, display: 'block' }}>
                                            Phone Integration
                                        </Typography>
                                        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1 }}>
                                            <Tooltip title="Allow incoming SIP calls">
                                                <FormControlLabel
                                                    control={
                                                        <Checkbox
                                                            size="small"
                                                            checked={permissions['sip-inbound-call']}
                                                            onChange={(e) => handlePermissionChange('sip-inbound-call', e.target.checked)}
                                                        />
                                                    }
                                                    label="SIP Inbound"
                                                />
                                            </Tooltip>
                                            <Tooltip title="Allow outgoing SIP calls">
                                                <FormControlLabel
                                                    control={
                                                        <Checkbox
                                                            size="small"
                                                            checked={permissions['sip-outbound-call']}
                                                            onChange={(e) => handlePermissionChange('sip-outbound-call', e.target.checked)}
                                                        />
                                                    }
                                                    label="SIP Outbound"
                                                />
                                            </Tooltip>
                                            <Tooltip title="Allow incoming phone calls">
                                                <FormControlLabel
                                                    control={
                                                        <Checkbox
                                                            size="small"
                                                            checked={permissions['inbound-call']}
                                                            onChange={(e) => handlePermissionChange('inbound-call', e.target.checked)}
                                                        />
                                                    }
                                                    label="Inbound Call"
                                                />
                                            </Tooltip>
                                            <Tooltip title="Allow outgoing phone calls">
                                                <FormControlLabel
                                                    control={
                                                        <Checkbox
                                                            size="small"
                                                            checked={permissions['outbound-call']}
                                                            onChange={(e) => handlePermissionChange('outbound-call', e.target.checked)}
                                                        />
                                                    }
                                                    label="Outbound Call"
                                                />
                                            </Tooltip>
                                        </Box>
                                        
                                        <Typography variant="caption" color="text.secondary" sx={{ mt: 2, mb: 1, display: 'block' }}>
                                            Other
                                        </Typography>
                                        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1 }}>
                                            <Tooltip title="View list of meeting visitors">
                                                <FormControlLabel
                                                    control={
                                                        <Checkbox
                                                            size="small"
                                                            checked={permissions['list-visitors']}
                                                            onChange={(e) => handlePermissionChange('list-visitors', e.target.checked)}
                                                        />
                                                    }
                                                    label="List Visitors"
                                                />
                                            </Tooltip>
                                            <Tooltip title="Hide user from recordings and streams">
                                                <FormControlLabel
                                                    control={
                                                        <Checkbox
                                                            size="small"
                                                            checked={permissions['hidden-from-recorder']}
                                                            onChange={(e) => handlePermissionChange('hidden-from-recorder', e.target.checked)}
                                                        />
                                                    }
                                                    label="Hidden from Recorder"
                                                />
                                            </Tooltip>
                                        </Box>
                                    </FormGroup>
                                </Box>
                            </Collapse>
                        </Box>
                    </Stack>
                    )}
                </CardContent>
            </Card>
            
            <Card>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        {tokenMode === 'generate' ? 'Generated Token' : 
                         tokenMode === 'external' ? 'External Token' : 
                         'Token Status'}
                    </Typography>
                    
                    {error && tokenMode === 'generate' && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {error}
                        </Alert>
                    )}
                    
                    {tokenMode === 'none' && (
                        <Alert severity="info" sx={{ mb: 2 }}>
                            No token will be used. The meeting will use guest access if available.
                        </Alert>
                    )}
                    
                    {tokenMode === 'external' && !externalJwt && (
                        <Alert severity="warning" sx={{ mb: 2 }}>
                            Please paste an external JWT token above to use this mode.
                        </Alert>
                    )}
                    
                    {getEffectiveJwt() ? (
                        <>
                            <Box sx={{ mb: 2 }}>
                                <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                                    <Chip 
                                        label={`Expires: ${expiration}`} 
                                        size="small" 
                                        color="primary" 
                                    />
                                    <Chip 
                                        label={moderator ? 'Moderator' : visitor ? 'Visitor' : 'Regular User'} 
                                        size="small" 
                                        color={moderator ? 'success' : visitor ? 'warning' : 'default'} 
                                    />
                                    <Chip 
                                        label={`Room: ${currentConference || '*'}`} 
                                        size="small" 
                                        variant="outlined" 
                                    />
                                </Stack>
                            </Box>
                            
                            <TextField
                                label="JWT"
                                value={getEffectiveJwt()}
                                multiline
                                rows={3}
                                fullWidth
                                InputProps={{
                                    readOnly: true,
                                    style: { fontFamily: 'monospace', fontSize: '0.8rem' },
                                    endAdornment: (
                                        <IconButton
                                            onClick={copyJwt}
                                            size="small"
                                            sx={{ 
                                                position: 'absolute', 
                                                top: 8, 
                                                right: 8,
                                                bgcolor: 'primary.main',
                                                color: 'white',
                                                '&:hover': {
                                                    bgcolor: 'primary.dark',
                                                }
                                            }}
                                        >
                                            <CopyIcon fontSize="small" />
                                        </IconButton>
                                    )
                                }}
                                sx={{ mb: 2, position: 'relative' }}
                            />

                            {/* Token Payload Section - only for generated tokens */}
                            {tokenMode === 'generate' && (
                            <Box sx={{ mb: 2 }}>
                                <Stack direction="row" alignItems="center" spacing={0.5}>
                                    <Typography variant="caption" color="text.secondary">
                                        Payload
                                    </Typography>
                                    <IconButton
                                        size="small"
                                        onClick={() => setPayloadExpanded(!payloadExpanded)}
                                        sx={{ 
                                            transition: 'transform 0.2s',
                                            transform: payloadExpanded ? 'rotate(180deg)' : 'rotate(0deg)'
                                        }}
                                        title="Show token payload"
                                    >
                                        <ExpandMore fontSize="small" />
                                    </IconButton>
                                </Stack>
                                
                                <Collapse in={payloadExpanded}>
                                    <Box sx={{ 
                                        mt: 1,
                                        p: 2,
                                        bgcolor: 'grey.50',
                                        borderRadius: 1,
                                        border: '1px solid',
                                        borderColor: 'grey.200',
                                        position: 'relative'
                                    }}>
                                        <IconButton
                                            onClick={copyPayload}
                                            size="small"
                                            sx={{ 
                                                position: 'absolute', 
                                                top: 8, 
                                                right: 8,
                                                bgcolor: 'primary.main',
                                                color: 'white',
                                                '&:hover': {
                                                    bgcolor: 'primary.dark',
                                                }
                                            }}
                                            title="Copy payload"
                                        >
                                            <CopyIcon fontSize="small" />
                                        </IconButton>
                                        
                                        <Typography 
                                            component="pre"
                                            sx={{ 
                                                fontFamily: 'monospace', 
                                                fontSize: '0.75rem',
                                                whiteSpace: 'pre-wrap',
                                                wordBreak: 'break-all',
                                                margin: 0,
                                                pr: 5 // Make room for copy button
                                            }}
                                        >
                                            {config ? JSON.stringify(generatePayload(tokenOptions), null, 2) : '{}'}
                                        </Typography>
                                    </Box>
                                </Collapse>
                            </Box>
                            )}
                            
                        </>
                    ) : (
                        <Alert severity="info">
                            Token generation requires configuration to be loaded. Please ensure config.json is properly set up with valid key ID and private key path.
                        </Alert>
                    )}
                </CardContent>
            </Card>
            
            {config && (
                <Card sx={{ mt: 3, mb: 3 }}>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>
                            Open Meeting
                        </Typography>
                        
                        <Box sx={{ mb: 2, position: 'relative' }}>
                            <Box
                                sx={{
                                    border: '1px solid rgba(0, 0, 0, 0.23)',
                                    borderRadius: 1,
                                    p: 2,
                                    position: 'relative',
                                }}
                            >
                                <Typography
                                    variant="caption"
                                    sx={{
                                        position: 'absolute',
                                        top: -6,
                                        left: 8,
                                        backgroundColor: 'background.paper',
                                        px: 0.5,
                                        fontSize: '0.75rem',
                                        color: 'text.secondary',
                                    }}
                                >
                                    Join Options
                                </Typography>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                                        <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
                                            Prejoin screen
                                        </Typography>
                                        <ToggleButtonGroup
                                            value={prejoinScreen}
                                            exclusive
                                            onChange={(e, value) => setPrejoinScreen(value || 'default')}
                                            size="small"
                                            sx={{ 
                                                '& .MuiToggleButton-root': { 
                                                    px: 1, 
                                                    py: 0.5, 
                                                    minWidth: 32,
                                                    '&.Mui-selected': {
                                                        backgroundColor: 'primary.main',
                                                        color: 'primary.contrastText',
                                                        '&:hover': {
                                                            backgroundColor: 'primary.dark',
                                                        }
                                                    }
                                                }
                                            }}
                                        >
                                            <ToggleButton value="off">OFF</ToggleButton>
                                            <ToggleButton value="default">_</ToggleButton>
                                            <ToggleButton value="on">ON</ToggleButton>
                                        </ToggleButtonGroup>
                                    </Box>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                                        <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
                                            P2P
                                        </Typography>
                                        <ToggleButtonGroup
                                            value={p2pSetting}
                                            exclusive
                                            onChange={(e, value) => setP2pSetting(value || 'default')}
                                            size="small"
                                            sx={{ 
                                                '& .MuiToggleButton-root': { 
                                                    px: 1, 
                                                    py: 0.5, 
                                                    minWidth: 32,
                                                    '&.Mui-selected': {
                                                        backgroundColor: 'primary.main',
                                                        color: 'primary.contrastText',
                                                        '&:hover': {
                                                            backgroundColor: 'primary.dark',
                                                        }
                                                    }
                                                }
                                            }}
                                        >
                                            <ToggleButton value="off">OFF</ToggleButton>
                                            <ToggleButton value="default">_</ToggleButton>
                                            <ToggleButton value="on">ON</ToggleButton>
                                        </ToggleButtonGroup>
                                    </Box>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                                        <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
                                            Audio
                                        </Typography>
                                        <ToggleButtonGroup
                                            value={audioSetting}
                                            exclusive
                                            onChange={(e, value) => setAudioSetting(value || 'default')}
                                            size="small"
                                            sx={{ 
                                                '& .MuiToggleButton-root': { 
                                                    px: 1, 
                                                    py: 0.5, 
                                                    minWidth: 32,
                                                    '&.Mui-selected': {
                                                        backgroundColor: 'primary.main',
                                                        color: 'primary.contrastText',
                                                        '&:hover': {
                                                            backgroundColor: 'primary.dark',
                                                        }
                                                    }
                                                }
                                            }}
                                        >
                                            <ToggleButton value="off">OFF</ToggleButton>
                                            <ToggleButton value="default">_</ToggleButton>
                                            <ToggleButton value="on">ON</ToggleButton>
                                        </ToggleButtonGroup>
                                    </Box>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                                        <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
                                            Video
                                        </Typography>
                                        <ToggleButtonGroup
                                            value={videoSetting}
                                            exclusive
                                            onChange={(e, value) => setVideoSetting(value || 'default')}
                                            size="small"
                                            sx={{ 
                                                '& .MuiToggleButton-root': { 
                                                    px: 1, 
                                                    py: 0.5, 
                                                    minWidth: 32,
                                                    '&.Mui-selected': {
                                                        backgroundColor: 'primary.main',
                                                        color: 'primary.contrastText',
                                                        '&:hover': {
                                                            backgroundColor: 'primary.dark',
                                                        }
                                                    }
                                                }
                                            }}
                                        >
                                            <ToggleButton value="off">OFF</ToggleButton>
                                            <ToggleButton value="default">_</ToggleButton>
                                            <ToggleButton value="on">ON</ToggleButton>
                                        </ToggleButtonGroup>
                                    </Box>
                                </Box>
                            </Box>
                        </Box>
                        
                        {/* Custom Config Overrides Section */}
                        <Box>
                            <Stack direction="row" alignItems="center" spacing={0.5}>
                                <Typography variant="subtitle2">
                                    Custom Config Overrides
                                </Typography>
                                <IconButton
                                    size="small"
                                    onClick={() => setConfigOverridesExpanded(!configOverridesExpanded)}
                                    sx={{ 
                                        transition: 'transform 0.2s',
                                        transform: configOverridesExpanded ? 'rotate(180deg)' : 'rotate(0deg)'
                                    }}
                                    title="Add custom configuration parameters"
                                >
                                    <ExpandMore fontSize="small" />
                                </IconButton>
                            </Stack>
                            
                            <Collapse in={configOverridesExpanded}>
                                <Box sx={{ 
                                    mt: 1,
                                    p: 2,
                                    bgcolor: 'grey.50',
                                    borderRadius: 1,
                                    border: '1px solid',
                                    borderColor: 'grey.200'
                                }}>
                                    <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                                        Add custom Jitsi configuration parameters. These will be added to the URL as "#config.key=value"
                                    </Typography>
                                    
                                    <Stack spacing={1}>
                                        {configOverrides.map((override) => (
                                            <Stack key={override.id} direction="row" spacing={1} alignItems="center">
                                                <TextField
                                                    size="small"
                                                    label="Config Key"
                                                    value={override.key}
                                                    onChange={(e) => updateConfigOverride(override.id, 'key', e.target.value)}
                                                    placeholder="e.g. startWithVideoMuted"
                                                    sx={{ flex: 1 }}
                                                />
                                                <TextField
                                                    size="small"
                                                    label="Value"
                                                    value={override.value}
                                                    onChange={(e) => updateConfigOverride(override.id, 'value', e.target.value)}
                                                    placeholder="e.g. true"
                                                    sx={{ flex: 1 }}
                                                />
                                                <IconButton
                                                    size="small"
                                                    onClick={() => removeConfigOverride(override.id)}
                                                    disabled={configOverrides.length === 1}
                                                    sx={{ color: 'error.main' }}
                                                    title="Remove this override"
                                                >
                                                    <RemoveIcon fontSize="small" />
                                                </IconButton>
                                            </Stack>
                                        ))}
                                        
                                        <Button
                                            size="small"
                                            startIcon={<AddIcon />}
                                            onClick={addConfigOverride}
                                            variant="outlined"
                                            sx={{ alignSelf: 'flex-start', mt: 1 }}
                                        >
                                            Add Override
                                        </Button>
                                    </Stack>
                                </Box>
                            </Collapse>
                        </Box>
                        
                        <Divider sx={{ my: 2 }} />
                        
                        <Stack direction="column" spacing={1} alignItems="center" sx={{ maxWidth: 320, mx: 'auto' }}>
                            <Button
                                variant="contained"
                                startIcon={<SwitchIcon />}
                                onClick={handleOpenMeetingTab}
                                disabled={!config || (tokenMode === 'external' && !externalJwt)}
                                fullWidth
                            >
                                Open in iFrame
                            </Button>
                            <Button
                                variant="outlined"
                                startIcon={<OpenInNewIcon />}
                                onClick={openConferenceLink}
                                disabled={!config}
                                fullWidth
                            >
                                Open in Browser tab
                            </Button>
                            <Button
                                variant="outlined"
                                startIcon={<LinkIcon />}
                                onClick={copyConferenceLink}
                                disabled={!config}
                                fullWidth
                            >
                                Copy Link
                            </Button>
                            
                            <Divider sx={{ my: 1, width: '100%' }} />
                            
                            <Button
                                variant="outlined"
                                startIcon={<QuickJoinIcon />}
                                onClick={handleQuickJoinClick}
                                disabled={!config}
                                fullWidth
                            >
                                Join URL in iFrame
                            </Button>
                        </Stack>
                    </CardContent>
                </Card>
            )}

            {/* Quick Join Dialog */}
            <Dialog 
                open={quickJoinDialogOpen} 
                onClose={() => setQuickJoinDialogOpen(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>Quick Join in iFrame</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <TextField
                            label="Meeting URL"
                            value={quickJoinUrl}
                            onChange={(e) => setQuickJoinUrl(e.target.value)}
                            placeholder="https://meet.jit.si/MyRoom or https://8x8.vc/vpaas-magic-cookie-xxxxx/MyRoom"
                            fullWidth
                            autoFocus
                        />
                        <FormGroup>
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={quickJoinUseToken}
                                        onChange={(e) => setQuickJoinUseToken(e.target.checked)}
                                        disabled={!getEffectiveJwt()}
                                    />
                                }
                                label={`Use token (${tokenMode === 'none' ? 'no token configured' : 
                                    tokenMode === 'external' ? 'external token' : 
                                    'generated token'})`}
                            />
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={quickJoinApplyConfig}
                                        onChange={(e) => setQuickJoinApplyConfig(e.target.checked)}
                                    />
                                }
                                label="Apply custom config (join options & config overrides)"
                            />
                        </FormGroup>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setQuickJoinDialogOpen(false)}>
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleQuickJoin}
                        variant="contained"
                        disabled={!quickJoinUrl.trim()}
                    >
                        Join
                    </Button>
                </DialogActions>
            </Dialog>
            
            <Snackbar
                open={!!copySuccess}
                autoHideDuration={3000}
                onClose={handleCloseCopySuccess}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert onClose={handleCloseCopySuccess} severity="success" sx={{ width: '100%' }}>
                    {copySuccess}
                </Alert>
            </Snackbar>
        </Box>
    );
}