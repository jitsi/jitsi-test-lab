import React, { useState, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    TextField,
    Button,
    Alert,
    Stack,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Chip,
    Paper,
    Collapse,
    IconButton,
    Snackbar
} from '@mui/material';
import {
    Api as ApiIcon,
    ExpandMore,
    Send as SendIcon,
    PersonOff as BanIcon,
    Block as BanJwtIcon,
    DeleteSweep as DestroyIcon,
    Call as DialIcon,
    CallEnd as HangupIcon,
    PersonRemove as KickIcon
} from '@mui/icons-material';
import { useAppContext } from '../App';
import { generateJwt } from '../utils/tokenGenerator';
import type { TokenOptions } from '../utils/tokenGenerator';

type EndpointType = 'ban-user' | 'ban-jwt' | 'destroy-room' | 'dial-out' | 'hangup-call' | 'kick-participant';

interface EndpointCall {
    id: string;
    timestamp: Date;
    type: EndpointType;
    params: Record<string, string>;
    response: {
        status: number;
        data: unknown;
        error?: string;
    } | null;
}

const ENDPOINT_CONFIGS = {
    'ban-user': {
        title: 'Ban User',
        description: 'Ban a user from accessing JaaS services',
        icon: <BanIcon />,
        color: 'error' as const,
        fields: [
            { key: 'userId', label: 'User ID', required: true, placeholder: 'user@example.com' }
        ]
    },
    'ban-jwt': {
        title: 'Ban JWT',
        description: 'Ban a specific JWT token',
        icon: <BanJwtIcon />,
        color: 'error' as const,
        fields: [
            { key: 'jwtToBan', label: 'JWT to Ban', required: true, placeholder: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...', multiline: true }
        ]
    },
    'destroy-room': {
        title: 'Destroy Room',
        description: 'End a meeting and disconnect all participants',
        icon: <DestroyIcon />,
        color: 'error' as const,
        fields: [
            { key: 'roomName', label: 'Room Name', required: true, placeholder: 'my-room' }
        ]
    },
    'dial-out': {
        title: 'Dial Out Participant',
        description: 'Dial out to a phone number to join the meeting',
        icon: <DialIcon />,
        color: 'primary' as const,
        fields: [
            { key: 'roomName', label: 'Room Name', required: true, placeholder: 'my-room' },
            { key: 'phoneNo', label: 'Phone Number', required: true, placeholder: '+1234567890' }
        ]
    },
    'hangup-call': {
        title: 'Hang Up Call',
        description: 'Hang up a specific phone participant',
        icon: <HangupIcon />,
        color: 'warning' as const,
        fields: [
            { key: 'roomName', label: 'Room Name', required: true, placeholder: 'my-room' },
            { key: 'phoneNo', label: 'Phone Number', required: true, placeholder: '+1234567890' }
        ]
    },
    'kick-participant': {
        title: 'Kick Participant',
        description: 'Remove a participant from the meeting',
        icon: <KickIcon />,
        color: 'warning' as const,
        fields: [
            { key: 'roomName', label: 'Room Name', required: true, placeholder: 'my-room' },
            { key: 'participantId', label: 'Participant ID', required: true, placeholder: 'participant-uuid' }
        ]
    }
};

export function EndpointsPage() {
    const { config } = useAppContext();
    const [selectedEndpoint, setSelectedEndpoint] = useState<EndpointType>('ban-user');
    const [params, setParams] = useState<Record<string, string>>({});
    const [adminToken, setAdminToken] = useState<string>('');
    const [adminTokenExpanded, setAdminTokenExpanded] = useState(true);
    const [callHistory, setCallHistory] = useState<EndpointCall[]>([]);
    const [historyExpanded, setHistoryExpanded] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState<string>('');

    const generateAdminToken = async () => {
        if (!config?.kid || !config?.privateKey) return;

        try {
            const tokenOptions: TokenOptions = {
                keyId: config.kid,
                privateKey: config.privateKey,
                displayName: 'Admin',
                exp: '24h',
                room: '*',
                moderator: true,
                permissions: {
                    admin: true // This is the key permission for JaaS endpoints
                }
            };

            const jwt = await generateJwt(tokenOptions);
            setAdminToken(jwt);
        } catch (error) {
            console.error('Failed to generate admin token:', error);
            setAdminToken('');
        }
    };

    // Generate admin token on component mount and config changes
    useEffect(() => {
        if (config?.kid && config?.privateKey) {
            generateAdminToken();
        }
    }, [config?.kid, config?.privateKey]);

    const handleParamChange = (key: string, value: string) => {
        setParams(prev => ({ ...prev, [key]: value }));
    };

    const buildEndpointUrl = (type: EndpointType, params: Record<string, string>): string => {
        if (!config?.tenant || !config?.domain) return '';

        const baseUrl = `https://${config.domain}/v1/_jaas`;
        const appId = config.tenant; // vpaas-magic-cookie-xxx

        switch (type) {
            case 'ban-user':
                return `${baseUrl}/jaccess/v1/access-management/${appId}/ban/user/${encodeURIComponent(params.userId || '')}`;
            case 'ban-jwt':
                return `${baseUrl}/jaccess/v1/access-management/${appId}/ban/jwt`;
            case 'destroy-room':
            case 'dial-out':
            case 'hangup-call':
            case 'kick-participant':
                return `${baseUrl}/conference-commands/v1/meeting`;
            default:
                return '';
        }
    };

    const buildRequestPayload = (type: EndpointType, params: Record<string, string>) => {
        if (!config?.tenant || !config?.domain) return null;

        // Build proper conferenceFullName: roomName@conference.tenant.domain
        const conferenceFullName = params.roomName
            ? `${params.roomName}@conference.${config.tenant}.${config.domain}`
            : '';

        switch (type) {
            case 'ban-user':
                return null; // No body for ban user
            case 'ban-jwt':
                return {
                    appId: config.tenant,
                    jwt: params.jwtToBan
                };
            case 'destroy-room':
                return {
                    action: 'DESTROY',
                    payload: {
                        conferenceFullName
                    }
                };
            case 'dial-out':
                return {
                    action: 'DIAL_OUT_PARTICIPANT',
                    payload: {
                        conferenceFullName,
                        phoneNo: params.phoneNo
                    }
                };
            case 'hangup-call':
                return {
                    action: 'HANG_UP_CALL',
                    payload: {
                        conferenceFullName,
                        phoneNo: params.phoneNo
                    }
                };
            case 'kick-participant':
                return {
                    action: 'KICK_PARTICIPANT',
                    payload: {
                        conferenceFullName,
                        participantId: params.participantId
                    }
                };
            default:
                return null;
        }
    };

    const executeEndpointCall = async () => {
        if (!adminToken) {
            setSnackbarMessage('Admin token is required');
            return;
        }

        const endpointConfig = ENDPOINT_CONFIGS[selectedEndpoint];
        const missingFields = endpointConfig.fields
            .filter(field => field.required && !params[field.key]?.trim())
            .map(field => field.label);

        if (missingFields.length > 0) {
            setSnackbarMessage(`Missing required fields: ${missingFields.join(', ')}`);
            return;
        }

        setIsLoading(true);

        const url = buildEndpointUrl(selectedEndpoint, params);
        const payload = buildRequestPayload(selectedEndpoint, params);

        const callId = Date.now().toString();
        const call: EndpointCall = {
            id: callId,
            timestamp: new Date(),
            type: selectedEndpoint,
            params: { ...params },
            response: null
        };

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${adminToken}`,
                    'Content-Type': 'application/json'
                },
                body: payload ? JSON.stringify(payload) : undefined
            });

            let responseData;
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                responseData = await response.json();
            } else {
                responseData = await response.text();
            }

            call.response = {
                status: response.status,
                data: responseData,
                error: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`
            };

            setSnackbarMessage(response.ok ? 'Request executed successfully' : `Request failed: ${response.status}`);
        } catch (error) {
            call.response = {
                status: 0,
                data: null,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            setSnackbarMessage(`Request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }

        setCallHistory(prev => [call, ...prev]);
        setIsLoading(false);
    };

    const clearHistory = () => {
        setCallHistory([]);
    };

    if (!config?.kid || !config?.privateKey) {
        return (
            <Box sx={{ p: 3 }}>
                <Typography variant="h4" gutterBottom>
                    JaaS Endpoints
                </Typography>
                <Alert severity="warning">
                    JaaS endpoint functionality requires authentication configuration. Please configure the Key ID and Private Key in Environment Config.
                </Alert>
            </Box>
        );
    }

    const endpointConfig = ENDPOINT_CONFIGS[selectedEndpoint];

    return (
        <Box sx={{ maxWidth: 800, mx: 'auto', height: '100%', overflow: 'auto', p: 3 }}>
            {/* Admin Token Section */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 2, cursor: 'pointer' }}
                           onClick={() => setAdminTokenExpanded(!adminTokenExpanded)}>
                        <ApiIcon color="primary" />
                        <Typography variant="h6">
                            Admin Token
                        </Typography>
                        <IconButton
                            size="small"
                            sx={{
                                transition: 'transform 0.2s',
                                transform: adminTokenExpanded ? 'rotate(180deg)' : 'rotate(0deg)'
                            }}
                        >
                            <ExpandMore fontSize="small" />
                        </IconButton>
                    </Stack>

                    <Collapse in={adminTokenExpanded}>
                        <Alert severity="info" sx={{ mb: 2 }}>
                            This token contains the <code>admin: true</code> permission required for JaaS endpoint calls.
                        </Alert>

                        {adminToken ? (
                            <TextField
                                label="Admin JWT"
                                value={adminToken}
                                multiline
                                rows={3}
                                fullWidth
                                InputProps={{
                                    readOnly: true,
                                    style: { fontFamily: 'monospace', fontSize: '0.8rem' }
                                }}
                            />
                        ) : (
                            <Alert severity="error">
                                Failed to generate admin token. Please check your authentication configuration.
                            </Alert>
                        )}

                        <Button
                            variant="outlined"
                            onClick={generateAdminToken}
                            sx={{ mt: 2 }}
                            disabled={!config?.kid || !config?.privateKey}
                        >
                            Regenerate Token
                        </Button>
                    </Collapse>
                </CardContent>
            </Card>

            {/* Endpoint Execution Section */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Execute Endpoint
                    </Typography>

                    <FormControl fullWidth sx={{ mb: 3 }}>
                        <InputLabel>Endpoint</InputLabel>
                        <Select
                            value={selectedEndpoint}
                            label="Endpoint"
                            onChange={(e) => {
                                setSelectedEndpoint(e.target.value as EndpointType);
                                setParams({});
                            }}
                        >
                            {Object.entries(ENDPOINT_CONFIGS).map(([key, config]) => (
                                <MenuItem key={key} value={key}>
                                    <Stack direction="row" alignItems="center" spacing={1}>
                                        {config.icon}
                                        <Typography>{config.title}</Typography>
                                    </Stack>
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <Alert severity="info" sx={{ mb: 3 }}>
                        <Typography variant="subtitle2" gutterBottom>
                            {endpointConfig.title}
                        </Typography>
                        <Typography variant="body2">
                            {endpointConfig.description}
                        </Typography>
                    </Alert>

                    <Stack spacing={2} sx={{ mb: 3 }}>
                        {endpointConfig.fields.map((field) => (
                            <TextField
                                key={field.key}
                                label={field.label}
                                placeholder={field.placeholder}
                                value={params[field.key] || ''}
                                onChange={(e) => handleParamChange(field.key, e.target.value)}
                                required={field.required}
                                multiline={field.multiline}
                                rows={field.multiline ? 3 : 1}
                                fullWidth
                            />
                        ))}
                    </Stack>

                    <Button
                        variant="contained"
                        color={endpointConfig.color}
                        startIcon={<SendIcon />}
                        onClick={executeEndpointCall}
                        disabled={isLoading || !adminToken}
                        fullWidth
                    >
                        {isLoading ? 'Executing...' : `Execute ${endpointConfig.title}`}
                    </Button>
                </CardContent>
            </Card>

            {/* Call History Section */}
            <Card>
                <CardContent>
                    <Stack direction="row" alignItems="center" justifyContent="space-between"
                           sx={{ mb: 2, cursor: 'pointer' }}
                           onClick={() => setHistoryExpanded(!historyExpanded)}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                            <Typography variant="h6">
                                Call History
                            </Typography>
                            <Chip label={callHistory.length} size="small" />
                        </Stack>
                        <Stack direction="row" alignItems="center" spacing={1}>
                            <Button
                                size="small"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    clearHistory();
                                }}
                                disabled={callHistory.length === 0}
                            >
                                Clear
                            </Button>
                            <IconButton
                                size="small"
                                sx={{
                                    transition: 'transform 0.2s',
                                    transform: historyExpanded ? 'rotate(180deg)' : 'rotate(0deg)'
                                }}
                            >
                                <ExpandMore fontSize="small" />
                            </IconButton>
                        </Stack>
                    </Stack>

                    <Collapse in={historyExpanded}>
                        {callHistory.length === 0 ? (
                            <Typography color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                                No API calls made yet.
                            </Typography>
                        ) : (
                            <Stack spacing={2}>
                                {callHistory.map((call) => (
                                    <Paper key={call.id} variant="outlined" sx={{ p: 2 }}>
                                        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 1 }}>
                                            <Chip
                                                label={ENDPOINT_CONFIGS[call.type].title}
                                                color={ENDPOINT_CONFIGS[call.type].color}
                                                size="small"
                                            />
                                            <Typography variant="caption" color="text.secondary">
                                                {call.timestamp.toLocaleString()}
                                            </Typography>
                                            {call.response && (
                                                <Chip
                                                    label={`${call.response.status}`}
                                                    size="small"
                                                    color={call.response.status >= 200 && call.response.status < 300 ? 'success' : 'error'}
                                                />
                                            )}
                                        </Stack>

                                        <Typography variant="body2" gutterBottom>
                                            <strong>Parameters:</strong> {JSON.stringify(call.params)}
                                        </Typography>

                                        {call.response && (
                                            <>
                                                <Typography variant="body2" gutterBottom>
                                                    <strong>Response:</strong>
                                                </Typography>
                                                <Typography
                                                    variant="body2"
                                                    component="pre"
                                                    sx={{
                                                        fontFamily: 'monospace',
                                                        fontSize: '0.75rem',
                                                        backgroundColor: 'grey.100',
                                                        p: 1,
                                                        borderRadius: 1,
                                                        overflow: 'auto',
                                                        whiteSpace: 'pre-wrap'
                                                    }}
                                                >
                                                    {call.response.error || JSON.stringify(call.response.data, null, 2)}
                                                </Typography>
                                            </>
                                        )}
                                    </Paper>
                                ))}
                            </Stack>
                        )}
                    </Collapse>
                </CardContent>
            </Card>

            <Snackbar
                open={!!snackbarMessage}
                autoHideDuration={4000}
                onClose={() => setSnackbarMessage('')}
                message={snackbarMessage}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            />
        </Box>
    );
}
