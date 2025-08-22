import { useState, useEffect } from 'react'
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Paper,
  Alert,
  TextField,
  Stack,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Tooltip,
  Collapse,
  Chip
} from '@mui/material'
import {
  Clear,
  ExpandMore,
  EventNote,
  Refresh
} from '@mui/icons-material'
import { useAppContext } from '../App'

// Interface for structured log entries (matches WebhookProxy)
interface WebhookLogEntry {
  id: string;
  timestamp: Date;
  eventName: string;
  data: any;
}

export function WebhooksPage() {
  const { getCurrentProxy, currentConference, config } = useAppContext()
  const [logs, setLogs] = useState<WebhookLogEntry[]>([])
  const [isAutoRefresh, setIsAutoRefresh] = useState(true)
  const [logFilter, setLogFilter] = useState('')
  const [webhookLogExpanded, setWebhookLogExpanded] = useState(true)

  const proxy = getCurrentProxy()
  
  // Filter logs based on event name or data content
  const filteredLogs = logFilter 
    ? logs.filter(log => 
        log.eventName.toLowerCase().includes(logFilter.toLowerCase()) ||
        JSON.stringify(log.data).toLowerCase().includes(logFilter.toLowerCase())
      )
    : logs
  
  console.log('WebhooksPage: Current conference:', currentConference, 'Proxy:', !!proxy)

  useEffect(() => {
    if (!proxy || !isAutoRefresh) return

    const interval = setInterval(() => {
      const currentLogs = proxy.getLogs()
      setLogs(currentLogs)
    }, 1000) // Refresh every second

    // Initial load
    const currentLogs = proxy.getLogs()
    setLogs(currentLogs)

    return () => clearInterval(interval)
  }, [proxy, isAutoRefresh])

  const handleClearLogs = () => {
    if (proxy) {
      proxy.clearLogs()
      setLogs([])
    }
  }

  const handleRefresh = () => {
    if (proxy) {
      const currentLogs = proxy.getLogs()
      setLogs(currentLogs)
    }
  }

  const handleReconnect = () => {
    if (proxy) {
      console.log('Manual reconnect requested for webhook proxy')
      proxy.disconnect()
      // Small delay to ensure disconnect completes before reconnecting
      setTimeout(() => {
        proxy.connect()
      }, 100)
    }
  }

  const toggleAutoRefresh = () => {
    setIsAutoRefresh(!isAutoRefresh)
  }

  if (!proxy) {
    const hasWebhookConfig = config?.webhooksProxy?.url && config?.webhooksProxy?.sharedSecret
    
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Webhooks
        </Typography>
        <Alert severity="error">
          {hasWebhookConfig 
            ? "No conference proxy available" 
            : "Webhook proxy is not configured in the current preset. Please select a preset that includes webhooksProxy configuration or add webhooksProxy settings to your custom configuration."}
        </Alert>
      </Box>
    )
  }

  return (
    <Box 
      sx={{ 
        maxWidth: 1200, 
        mx: 'auto', 
        height: '100vh', 
        display: 'flex',
        flexDirection: 'column',
        p: 3
      }}
    >
      <Stack spacing={3} sx={{ flex: 1, overflow: 'hidden' }}>
        {/* Webhook Log Section */}
        <Card sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <Stack 
              direction="row" 
              alignItems="center" 
              justifyContent="space-between" 
              sx={{ mb: webhookLogExpanded ? 2 : 0, cursor: 'pointer' }}
              onClick={() => setWebhookLogExpanded(!webhookLogExpanded)}
            >
              <Stack direction="row" alignItems="center" spacing={1}>
                <EventNote color="primary" />
                <Typography variant="h6">
                  Webhook Event Log - {currentConference}
                </Typography>
                <Chip 
                  label={`${filteredLogs.length}${logFilter ? `/${logs.length}` : ''}`} 
                  size="small" 
                  color="primary" 
                />
              </Stack>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Tooltip title="Refresh logs">
                  <IconButton 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRefresh();
                    }} 
                    size="small"
                    disabled={isAutoRefresh}
                  >
                    <Refresh />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Toggle auto refresh">
                  <Button
                    size="small"
                    variant={isAutoRefresh ? 'contained' : 'outlined'}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleAutoRefresh();
                    }}
                    sx={{ minWidth: 'auto', px: 1 }}
                  >
                    {isAutoRefresh ? 'Auto' : 'Manual'}
                  </Button>
                </Tooltip>
                <Tooltip title="Reconnect proxy">
                  <Button
                    size="small"
                    variant="outlined"
                    color="warning"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReconnect();
                    }}
                    sx={{ minWidth: 'auto', px: 1 }}
                  >
                    Reconnect
                  </Button>
                </Tooltip>
                <Tooltip title="Clear webhook log">
                  <IconButton 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClearLogs();
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
                    transform: webhookLogExpanded ? 'rotate(180deg)' : 'rotate(0deg)'
                  }}
                >
                  <ExpandMore />
                </IconButton>
              </Stack>
            </Stack>
            
            <Collapse in={webhookLogExpanded} sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              {/* Filter Input */}
              <TextField
                label="Filter webhook events"
                placeholder="e.g. connected, participant_joined, audio"
                value={logFilter}
                onChange={(e) => setLogFilter(e.target.value)}
                size="small"
                fullWidth
                sx={{ mb: 2, flexShrink: 0 }}
                InputProps={{
                  startAdornment: logFilter && (
                    <IconButton
                      size="small"
                      onClick={() => setLogFilter('')}
                      sx={{ mr: 1 }}
                    >
                      <Clear fontSize="small" />
                    </IconButton>
                  )
                }}
              />
              
              <Paper variant="outlined" sx={{ flex: 1, overflow: 'auto', bgcolor: '#fafafa', minHeight: 0 }}>
                {filteredLogs.length === 0 ? (
                  <Box sx={{ p: 3, textAlign: 'center' }}>
                    <Typography color="text.secondary">
                      {logFilter 
                        ? `No webhook events found matching "${logFilter}". Try a different filter or clear it to see all events.`
                        : logs.length === 0
                          ? "No webhook events logged yet. Events will appear here when webhook messages are received."
                          : "No events match the current filter."
                      }
                    </Typography>
                  </Box>
                ) : (
                  <List dense>
                    {filteredLogs.map((log) => (
                      <ListItem key={log.id} divider>
                        <ListItemText
                          primary={
                            <Stack direction="row" alignItems="center" spacing={1}>
                              <Typography variant="body2" color="primary" component="span">
                                {log.eventName}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" component="span">
                                {log.timestamp.toLocaleTimeString()}
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
                              {JSON.stringify(log.data, null, 2)}
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
  )
}