import React, { useState, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Button,
    TextField,
    Stack,
    Tabs,
    Tab,
    Chip,
    Paper,
    Divider,
    Alert,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    List,
    ListItem,
    ListItemText,
    IconButton,
    Tooltip,
    Collapse
} from '@mui/material';
import {
    ExpandMore,
    PlayArrow,
    Clear,
    Settings as SettingsIcon,
    EventNote
} from '@mui/icons-material';
import { useTabsContext } from '../contexts/TabsContext';

export function IFrameControlPage() {
    const { tabs, activeTabId, getTabApi, getApiEvents, clearApiEvents } = useTabsContext();
    const [customCommand, setCustomCommand] = useState('');
    const [customCommandArgs, setCustomCommandArgs] = useState('');
    
    // Function input states for various commands
    const [inviteEmail, setInviteEmail] = useState('');
    const [invitePhone, setInvitePhone] = useState('');
    const [chatMessage, setChatMessage] = useState('');
    const [breakoutRoomName, setBreakoutRoomName] = useState('');
    const [streamKey, setStreamKey] = useState('');
    const [streamUrl, setStreamUrl] = useState('');
    const [eventFilter, setEventFilter] = useState('');
    const [iframeControlExpanded, setIframeControlExpanded] = useState(true);
    const [eventLogExpanded, setEventLogExpanded] = useState(true);

    const selectedTab = activeTabId ? tabs.find(tab => tab.id === activeTabId) : null;
    const allEvents = activeTabId ? getApiEvents(activeTabId) : [];
    const eventLog = eventFilter 
        ? allEvents.filter(event => event.eventName.toLowerCase().includes(eventFilter.toLowerCase()))
        : allEvents;
    
    // Debug logging
    useEffect(() => {
        console.log('IFrameControl: activeTabId:', activeTabId);
        console.log('IFrameControl: selectedTab:', selectedTab?.title);
        console.log('IFrameControl: eventLog length:', eventLog.length);
        console.log('IFrameControl: allEvents length:', allEvents.length);
        if (eventLog.length > 0) {
            console.log('IFrameControl: Latest events:', eventLog.slice(0, 3));
        }
    }, [activeTabId, selectedTab, eventLog, allEvents]);

    const executeCommand = (command: string, ...args: any[]) => {
        if (!activeTabId) return;
        
        const api = getTabApi(activeTabId);
        if (!api) {
            console.error('No API available for selected tab');
            return;
        }
        
        try {
            api.executeCommand(command, ...args);
            // Event logging is handled by TabContent component
        } catch (error) {
            console.error('Command execution failed:', error);
        }
    };

    const clearEventLog = () => {
        if (activeTabId) {
            clearApiEvents(activeTabId);
        }
    };

    if (!selectedTab) {
        return (
            <Box sx={{ maxWidth: 800, mx: 'auto', height: '100%', overflow: 'auto', p: 3 }}>
                <Alert severity="info">
                    {tabs.length === 0 
                        ? "No active tabs found. Please open a meeting tab first from the Participants page."
                        : "No tab selected. Please click on a tab in the left sidebar to control it."
                    }
                </Alert>
            </Box>
        );
    }

    return (
        <Box 
            sx={{ 
                maxWidth: 1200, 
                mx: 'auto', 
                height: '100%', 
                overflow: 'auto', 
                p: 3,
                ...(selectedTab.color && {
                    background: `linear-gradient(135deg, ${selectedTab.color}25, ${selectedTab.color}10)`,
                    borderLeft: `6px solid ${selectedTab.color}`,
                    borderRadius: '8px 0 0 8px'
                })
            }}
        >
            <Stack spacing={3}>
                {/* iFrame Control Section */}
                    <Card>
                        <CardContent>
                            <Stack 
                                direction="row" 
                                alignItems="center" 
                                justifyContent="space-between" 
                                sx={{ mb: iframeControlExpanded ? 3 : 0, cursor: 'pointer' }}
                                onClick={() => setIframeControlExpanded(!iframeControlExpanded)}
                            >
                                <Stack direction="row" alignItems="center" spacing={1}>
                                    <SettingsIcon color="primary" />
                                    <Typography variant="h6">
                                        iFrame Control
                                    </Typography>
                                </Stack>
                                <IconButton
                                    size="small"
                                    sx={{ 
                                        transition: 'transform 0.2s',
                                        transform: iframeControlExpanded ? 'rotate(180deg)' : 'rotate(0deg)'
                                    }}
                                >
                                    <ExpandMore />
                                </IconButton>
                            </Stack>

                            <Collapse in={iframeControlExpanded}>

                            <Stack spacing={2}>
                                {/* Audio/Video Controls */}
                                <Accordion>
                                    <AccordionSummary expandIcon={<ExpandMore />}>
                                        <Typography variant="subtitle1">Audio/Video Controls</Typography>
                                    </AccordionSummary>
                                    <AccordionDetails>
                                        <Stack direction="row" spacing={1} flexWrap="wrap">
                                            <Button
                                                variant="outlined"
                                                onClick={() => executeCommand('toggleAudio')}
                                            >
                                                Toggle Audio
                                            </Button>
                                            <Button
                                                variant="outlined"
                                                onClick={() => executeCommand('toggleVideo')}
                                            >
                                                Toggle Video
                                            </Button>
                                            <Button
                                                variant="outlined"
                                                onClick={() => executeCommand('toggleShareScreen')}
                                            >
                                                Toggle Screen Share
                                            </Button>
                                            <Button
                                                variant="outlined"
                                                onClick={() => executeCommand('hangup')}
                                                color="error"
                                            >
                                                Hangup
                                            </Button>
                                        </Stack>
                                    </AccordionDetails>
                                </Accordion>

                                {/* Recording/Streaming */}
                                <Accordion>
                                    <AccordionSummary expandIcon={<ExpandMore />}>
                                        <Typography variant="subtitle1">Recording & Streaming</Typography>
                                    </AccordionSummary>
                                    <AccordionDetails>
                                        <Stack spacing={2}>
                                            <Stack direction="row" spacing={1} flexWrap="wrap">
                                                <Button
                                                    variant="outlined"
                                                    onClick={() => executeCommand('startRecording', { mode: 'file' })}
                                                >
                                                    Start Recording
                                                </Button>
                                                <Button
                                                    variant="outlined"
                                                    onClick={() => executeCommand('stopRecording', 'file')}
                                                >
                                                    Stop Recording
                                                </Button>
                                            </Stack>
                                            
                                            <Divider />
                                            
                                            <Typography variant="subtitle2">Live Streaming</Typography>
                                            <Stack direction="row" spacing={1} alignItems="end">
                                                <TextField
                                                    label="Stream Key"
                                                    value={streamKey}
                                                    onChange={(e) => setStreamKey(e.target.value)}
                                                    size="small"
                                                    sx={{ flex: 1 }}
                                                />
                                                <Button
                                                    variant="outlined"
                                                    onClick={() => executeCommand('startRecording', {
                                                        mode: 'stream',
                                                        youtubeStreamKey: streamKey,
                                                        shouldShare: true
                                                    })}
                                                    disabled={!streamKey}
                                                >
                                                    Start Streaming
                                                </Button>
                                                <Button
                                                    variant="outlined"
                                                    onClick={() => executeCommand('stopRecording', 'stream')}
                                                >
                                                    Stop Streaming
                                                </Button>
                                            </Stack>
                                        </Stack>
                                    </AccordionDetails>
                                </Accordion>

                                {/* Communication */}
                                <Accordion>
                                    <AccordionSummary expandIcon={<ExpandMore />}>
                                        <Typography variant="subtitle1">Communication</Typography>
                                    </AccordionSummary>
                                    <AccordionDetails>
                                        <Stack spacing={2}>
                                            <Stack direction="row" spacing={1} alignItems="end">
                                                <TextField
                                                    label="Chat Message"
                                                    value={chatMessage}
                                                    onChange={(e) => setChatMessage(e.target.value)}
                                                    size="small"
                                                    sx={{ flex: 1 }}
                                                />
                                                <Button
                                                    variant="outlined"
                                                    onClick={() => {
                                                        executeCommand('sendChatMessage', chatMessage);
                                                        setChatMessage('');
                                                    }}
                                                    disabled={!chatMessage}
                                                >
                                                    Send Message
                                                </Button>
                                            </Stack>
                                            
                                            <Divider />
                                            
                                            <Typography variant="subtitle2">Invites</Typography>
                                            <Stack direction="row" spacing={1} alignItems="end">
                                                <TextField
                                                    label="Email Address"
                                                    value={inviteEmail}
                                                    onChange={(e) => setInviteEmail(e.target.value)}
                                                    size="small"
                                                    sx={{ flex: 1 }}
                                                />
                                                <Button
                                                    variant="outlined"
                                                    onClick={() => {
                                                        executeCommand('invite', [{ type: 'email', address: inviteEmail }]);
                                                        setInviteEmail('');
                                                    }}
                                                    disabled={!inviteEmail}
                                                >
                                                    Invite by Email
                                                </Button>
                                            </Stack>
                                            <Stack direction="row" spacing={1} alignItems="end">
                                                <TextField
                                                    label="Phone Number"
                                                    value={invitePhone}
                                                    onChange={(e) => setInvitePhone(e.target.value)}
                                                    size="small"
                                                    sx={{ flex: 1 }}
                                                />
                                                <Button
                                                    variant="outlined"
                                                    onClick={() => {
                                                        executeCommand('invite', [{ type: 'phone', number: invitePhone }]);
                                                        setInvitePhone('');
                                                    }}
                                                    disabled={!invitePhone}
                                                >
                                                    Invite by Phone
                                                </Button>
                                            </Stack>
                                        </Stack>
                                    </AccordionDetails>
                                </Accordion>

                                {/* Meeting Management */}
                                <Accordion>
                                    <AccordionSummary expandIcon={<ExpandMore />}>
                                        <Typography variant="subtitle1">Meeting Management</Typography>
                                    </AccordionSummary>
                                    <AccordionDetails>
                                        <Stack spacing={2}>
                                            <Stack direction="row" spacing={1} flexWrap="wrap">
                                                <Button
                                                    variant="outlined"
                                                    onClick={() => executeCommand('toggleParticipantsPane', true)}
                                                >
                                                    Toggle Participants
                                                </Button>
                                                <Button
                                                    variant="outlined"
                                                    onClick={() => executeCommand('toggleSubtitles')}
                                                >
                                                    Toggle Subtitles
                                                </Button>
                                                <Button
                                                    variant="outlined"
                                                    onClick={() => executeCommand('setFollowMe', true)}
                                                >
                                                    Follow Me
                                                </Button>
                                                <Button
                                                    variant="outlined"
                                                    onClick={() => executeCommand('setFollowMe', false)}
                                                >
                                                    Unfollow Me
                                                </Button>
                                            </Stack>
                                            
                                            <Divider />
                                            
                                            <Typography variant="subtitle2">Breakout Rooms</Typography>
                                            <Stack direction="row" spacing={1} alignItems="end">
                                                <TextField
                                                    label="Room Name"
                                                    value={breakoutRoomName}
                                                    onChange={(e) => setBreakoutRoomName(e.target.value)}
                                                    size="small"
                                                    sx={{ flex: 1 }}
                                                />
                                                <Button
                                                    variant="outlined"
                                                    onClick={() => {
                                                        executeCommand('addBreakoutRoom', breakoutRoomName || `Room ${Date.now()}`);
                                                        setBreakoutRoomName('');
                                                    }}
                                                >
                                                    Create Breakout Room
                                                </Button>
                                            </Stack>
                                        </Stack>
                                    </AccordionDetails>
                                </Accordion>

                                {/* Custom Command */}
                                <Accordion>
                                    <AccordionSummary expandIcon={<ExpandMore />}>
                                        <Typography variant="subtitle1">Custom Command</Typography>
                                    </AccordionSummary>
                                    <AccordionDetails>
                                        <Stack spacing={2}>
                                            <TextField
                                                label="Command Name"
                                                value={customCommand}
                                                onChange={(e) => setCustomCommand(e.target.value)}
                                                placeholder="e.g. toggleTileView"
                                                size="small"
                                            />
                                            <TextField
                                                label="Arguments (JSON)"
                                                value={customCommandArgs}
                                                onChange={(e) => setCustomCommandArgs(e.target.value)}
                                                placeholder='e.g. {"enabled": true}'
                                                multiline
                                                rows={2}
                                                size="small"
                                            />
                                            <Button
                                                variant="contained"
                                                startIcon={<PlayArrow />}
                                                onClick={() => {
                                                    try {
                                                        const args = customCommandArgs ? JSON.parse(customCommandArgs) : undefined;
                                                        executeCommand(customCommand, args);
                                                    } catch (error) {
                                                        console.error('Invalid JSON in arguments:', error);
                                                        addEventLogEntry('commandFailed', { 
                                                            command: customCommand, 
                                                            error: 'Invalid JSON arguments' 
                                                        });
                                                    }
                                                }}
                                                disabled={!customCommand}
                                            >
                                                Execute Command
                                            </Button>
                                        </Stack>
                                    </AccordionDetails>
                                </Accordion>
                            </Stack>
                            </Collapse>
                        </CardContent>
                    </Card>

                    {/* Event Log Section */}
                    <Card>
                        <CardContent>
                            <Stack 
                                direction="row" 
                                alignItems="center" 
                                justifyContent="space-between" 
                                sx={{ mb: eventLogExpanded ? 2 : 0, cursor: 'pointer' }}
                                onClick={() => setEventLogExpanded(!eventLogExpanded)}
                            >
                                <Stack direction="row" alignItems="center" spacing={1}>
                                    <EventNote color="primary" />
                                    <Typography variant="h6">
                                        Event Log
                                    </Typography>
                                    <Chip label={`${eventLog.length}${eventFilter ? `/${allEvents.length}` : ''}`} size="small" color="primary" />
                                </Stack>
                                <Stack direction="row" alignItems="center" spacing={1}>
                                    <Tooltip title="Clear event log">
                                        <IconButton 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                clearEventLog();
                                            }} 
                                            size="small"
                                        >
                                            <Clear />
                                        </IconButton>
                                    </Tooltip>
                                    <IconButton
                                        size="small"
                                        sx={{ 
                                            transition: 'transform 0.2s',
                                            transform: eventLogExpanded ? 'rotate(180deg)' : 'rotate(0deg)'
                                        }}
                                    >
                                        <ExpandMore />
                                    </IconButton>
                                </Stack>
                            </Stack>
                            
                            <Collapse in={eventLogExpanded}>
                            
                            {/* Filter Input */}
                            <TextField
                                label="Filter events"
                                placeholder="e.g. participant, audio, video"
                                value={eventFilter}
                                onChange={(e) => setEventFilter(e.target.value)}
                                size="small"
                                fullWidth
                                sx={{ mb: 2 }}
                                InputProps={{
                                    startAdornment: eventFilter && (
                                        <IconButton
                                            size="small"
                                            onClick={() => setEventFilter('')}
                                            sx={{ mr: 1 }}
                                        >
                                            <Clear fontSize="small" />
                                        </IconButton>
                                    )
                                }}
                            />
                            
                            <Paper variant="outlined" sx={{ maxHeight: 400, overflow: 'auto', bgcolor: '#fafafa' }}>
                                {eventLog.length === 0 ? (
                                    <Box sx={{ p: 3, textAlign: 'center' }}>
                                        <Typography color="text.secondary">
                                            {eventFilter 
                                                ? `No events found matching "${eventFilter}". Try a different filter or clear it to see all events.`
                                                : "No events logged yet. Events will appear here when you interact with the selected tab or execute commands."
                                            }
                                        </Typography>
                                    </Box>
                                ) : (
                                    <List dense>
                                        {eventLog.map((event) => (
                                            <ListItem key={event.id} divider>
                                                <ListItemText
                                                    primary={
                                                        <Stack direction="row" alignItems="center" spacing={1}>
                                                            <Typography variant="body2" color="primary" component="span">
                                                                {event.eventName}
                                                            </Typography>
                                                            <Typography variant="caption" color="text.secondary" component="span">
                                                                {event.timestamp.toLocaleTimeString()}
                                                            </Typography>
                                                        </Stack>
                                                    }
                                                    secondary={
                                                        <Typography 
                                                            variant="body2" 
                                                            component="pre" 
                                                            sx={{ 
                                                                fontFamily: 'monospace', 
                                                                fontSize: '0.75rem',
                                                                whiteSpace: 'pre-wrap',
                                                                wordBreak: 'break-word',
                                                                mt: 0.5
                                                            }}
                                                        >
                                                            {JSON.stringify(event.data, null, 2)}
                                                        </Typography>
                                                    }
                                                />
                                            </ListItem>
                                        ))}
                                    </List>
                                )}
                            </Paper>
                            </Collapse>
                        </CardContent>
                    </Card>
            </Stack>
        </Box>
    );
}