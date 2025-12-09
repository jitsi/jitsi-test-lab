import { useState, useEffect } from 'react'

// Extend window to include our timeout
declare global {
  interface Window {
    roomSwitchTimeout?: NodeJS.Timeout;
  }
}
import {
  Box,
  Card,
  CardContent,
  Checkbox,
  FormControl,
  FormControlLabel,
  FormGroup,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
  Alert,
  Chip,
  Button,
  Stack,
  Divider,
  IconButton,
  Collapse
} from '@mui/material'
import { useAppContext } from '../App'
import { ExpandMore, Add as AddIcon, Remove as RemoveIcon } from '@mui/icons-material'
import { v4 as uuidv4 } from 'uuid'

// Inline interface to avoid import issues
interface IMeetingSettings {
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

export function SettingsPage() {
  const { getCurrentProxy, currentConference, setCurrentConference, addConference, config } = useAppContext()
  const [settings, setSettings] = useState<IMeetingSettings>({})
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [newRoomName, setNewRoomName] = useState('')
  const [roomNameError, setRoomNameError] = useState('')
  const [configOverridesExpanded, setConfigOverridesExpanded] = useState<boolean>(false)

  // Custom config overrides state
  const [configOverrides, setConfigOverrides] = useState<Array<{key: string, value: string, id: string}>>(() => {
    try {
      const saved = localStorage.getItem('room-config-overrides')
      return saved ? JSON.parse(saved) : [{ key: '', value: '', id: uuidv4() }]
    } catch {
      return [{ key: '', value: '', id: uuidv4() }]
    }
  })

  const proxy = getCurrentProxy()

  useEffect(() => {
    if (proxy?.defaultMeetingSettings) {
      setSettings(proxy.defaultMeetingSettings)
    }
  }, [proxy])

  // Save config overrides to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('room-config-overrides', JSON.stringify(configOverrides))
    } catch (error) {
      console.error('Failed to save config overrides:', error)
    }
  }, [configOverrides])

  const addConfigOverride = () => {
    setConfigOverrides(prev => [...prev, { key: '', value: '', id: uuidv4() }])
  }

  const removeConfigOverride = (id: string) => {
    setConfigOverrides(prev => prev.filter(item => item.id !== id))
  }

  const updateConfigOverride = (id: string, field: 'key' | 'value', newValue: string) => {
    setConfigOverrides(prev => prev.map(item =>
      item.id === id ? { ...item, [field]: newValue } : item
    ))
  }

  // Clear the new room name field when currentConference changes (to show it was successful)
  useEffect(() => {
    setNewRoomName('')
    setRoomNameError('')
  }, [currentConference])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (window.roomSwitchTimeout) {
        clearTimeout(window.roomSwitchTimeout)
      }
    }
  }, [])

  // Auto-save whenever settings or config overrides change
  useEffect(() => {
    const autoSave = async () => {
      if (proxy && Object.keys(settings).length > 0) {
        setSaveStatus('saving')
        try {
          // Combine standard settings with custom settings
          const customSettings: Record<string, any> = {};
          configOverrides
            .filter(co => co.key.trim() && co.value.trim())
            .forEach(co => {
              // Convert value to appropriate type
              let value: any = co.value;
              if (co.value.toLowerCase() === 'true') value = true;
              else if (co.value.toLowerCase() === 'false') value = false;
              else if (!isNaN(Number(co.value)) && co.value.trim() !== '') value = Number(co.value);

              customSettings[co.key] = value;
            });

          const combinedSettings = { ...settings, ...customSettings };
          proxy.defaultMeetingSettings = combinedSettings;
          setSaveStatus('saved')
          // Clear the saved status after 2 seconds
          setTimeout(() => setSaveStatus('idle'), 2000)
        } catch (error) {
          console.error('Failed to save settings:', error)
          setSaveStatus('error')
          setTimeout(() => setSaveStatus('idle'), 3000)
        }
      }
    }

    // Debounce the auto-save to avoid excessive calls
    const timeoutId = setTimeout(autoSave, 300)
    return () => clearTimeout(timeoutId)
  }, [settings, proxy, configOverrides])

  const handleSettingChange = (key: keyof IMeetingSettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const handleCreateRoom = (roomName?: string) => {
    const targetRoomName = roomName || newRoomName.trim()
    console.log('Creating room:', targetRoomName, 'Current room:', currentConference)
    
    if (!targetRoomName) {
      setRoomNameError('Room name cannot be empty')
      return
    }
    
    if (targetRoomName === currentConference) {
      setRoomNameError('Room already exists and is current')
      return
    }

    try {
      // Add the new conference (this will create a new proxy and auto-switch)
      console.log('Adding conference:', targetRoomName)
      addConference(targetRoomName)
      
      // Clear the input and error
      setNewRoomName('')
      setRoomNameError('')
      
      // Show success message
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
      
      console.log('Room creation completed successfully')
    } catch (error) {
      console.error('Failed to create room:', error)
      setRoomNameError('Failed to create room. Please try again.')
    }
  }

  if (!proxy) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Settings
        </Typography>
        <Alert severity="warning">No conference proxy available</Alert>
      </Box>
    )
  }

  const getSaveStatusColor = () => {
    switch (saveStatus) {
      case 'saving': return 'warning'
      case 'saved': return 'success'
      case 'error': return 'error'
      default: return 'default'
    }
  }

  const getSaveStatusText = () => {
    switch (saveStatus) {
      case 'saving': return 'Saving...'
      case 'saved': return 'Saved'
      case 'error': return 'Error'
      default: return ''
    }
  }

  // Check if webhook proxy is configured
  const hasWebhookConfig = config?.webhooksProxy?.url && config?.webhooksProxy?.sharedSecret

  return (
    <Box sx={{ p: 3, height: '100%', overflow: 'auto' }}>
      {getSaveStatusText() && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', mb: 2 }}>
          <Chip 
            label={getSaveStatusText()} 
            color={getSaveStatusColor()}
            variant={saveStatus === 'idle' ? 'outlined' : 'filled'}
            size="small"
          />
        </Box>
      )}
      
      {saveStatus === 'error' && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Error saving settings - changes will be retried automatically
        </Alert>
      )}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Room Configuration
          </Typography>
          
          <Alert severity="info" sx={{ mb: 2 }}>
            Current room: <strong>{currentConference}</strong>
          </Alert>
          
          {!hasWebhookConfig && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Webhook proxy is not configured. Most settings require webhook functionality and are disabled. 
              Only room switching is available.
            </Alert>
          )}

          <TextField
            label="Room Name"
            value={newRoomName || currentConference || ''}
            onChange={(e) => {
              const inputValue = e.target.value
              const roomName = inputValue.trim()
              setNewRoomName(inputValue)
              setRoomNameError('')
              
              // Auto-switch when user types a valid room name that's different from current
              if (roomName && roomName !== currentConference) {
                // Debounce the room creation
                clearTimeout(window.roomSwitchTimeout)
                window.roomSwitchTimeout = setTimeout(() => {
                  handleCreateRoom(roomName)
                }, 500) // Wait 500ms after user stops typing
              }
            }}
            onFocus={(e) => {
              // If the field shows the current room name, clear it when focused to allow easy editing
              if (!newRoomName && currentConference) {
                setNewRoomName('')
              }
            }}
            error={!!roomNameError}
            helperText={roomNameError || 'Shows current room name. Type a new name to switch rooms automatically.'}
            fullWidth
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Recording Settings
          </Typography>
          
          <FormGroup sx={{ mb: 3 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={settings.autoAudioRecording || false}
                  onChange={(e) => handleSettingChange('autoAudioRecording', e.target.checked)}
                  disabled={!hasWebhookConfig}
                />
              }
              label="Auto Audio Recording"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={settings.autoVideoRecording || false}
                  onChange={(e) => handleSettingChange('autoVideoRecording', e.target.checked)}
                  disabled={!hasWebhookConfig}
                />
              }
              label="Auto Video Recording"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={settings.autoTranscriptions || false}
                  onChange={(e) => handleSettingChange('autoTranscriptions', e.target.checked)}
                  disabled={!hasWebhookConfig}
                />
              }
              label="Auto Transcriptions"
            />
          </FormGroup>

          <Typography variant="h6" gutterBottom>
            Lobby Settings
          </Typography>
          
          <FormGroup sx={{ mb: 3 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={settings.lobbyEnabled || false}
                  onChange={(e) => handleSettingChange('lobbyEnabled', e.target.checked)}
                  disabled={!hasWebhookConfig}
                />
              }
              label="Lobby Enabled"
            />
          </FormGroup>

          {settings.lobbyEnabled && (
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>Lobby Type</InputLabel>
              <Select
                value={settings.lobbyType || 'WAIT_FOR_MODERATOR'}
                label="Lobby Type"
                onChange={(e) => handleSettingChange('lobbyType', e.target.value)}
                disabled={!hasWebhookConfig}
              >
                <MenuItem value="WAIT_FOR_APPROVAL">Wait for Approval</MenuItem>
                <MenuItem value="WAIT_FOR_MODERATOR">Wait for Moderator</MenuItem>
              </Select>
            </FormControl>
          )}

          <Typography variant="h6" gutterBottom>
            Capacity Settings
          </Typography>

          <TextField
            fullWidth
            label="Max Occupants"
            type="number"
            value={settings.maxOccupants || ''}
            onChange={(e) => handleSettingChange('maxOccupants', parseInt(e.target.value) || undefined)}
            sx={{ mb: 2 }}
            inputProps={{ min: 1 }}
            disabled={!hasWebhookConfig}
          />

          <TextField
            fullWidth
            label="Participants Soft Limit"
            type="number"
            value={settings.participantsSoftLimit || ''}
            onChange={(e) => handleSettingChange('participantsSoftLimit', parseInt(e.target.value) || undefined)}
            sx={{ mb: 3 }}
            inputProps={{ min: 1 }}
            disabled={!hasWebhookConfig}
          />

          <Typography variant="h6" gutterBottom>
            Security Settings
          </Typography>

          <TextField
            fullWidth
            label="Passcode"
            type="password"
            value={settings.passcode || ''}
            onChange={(e) => handleSettingChange('passcode', e.target.value)}
            sx={{ mb: 3 }}
            disabled={!hasWebhookConfig}
          />

          <Typography variant="h6" gutterBottom>
            Visitor Settings
          </Typography>

          <FormGroup sx={{ mb: 3 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={settings.visitorsEnabled || false}
                  onChange={(e) => handleSettingChange('visitorsEnabled', e.target.checked)}
                  disabled={!hasWebhookConfig}
                />
              }
              label="Visitors Enabled"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={settings.visitorsLive || false}
                  onChange={(e) => handleSettingChange('visitorsLive', e.target.checked)}
                  disabled={!hasWebhookConfig}
                />
              }
              label="Visitors Live"
            />
          </FormGroup>

          <Typography variant="h6" gutterBottom>
            Transcription Settings
          </Typography>

          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel>Transcriber Type</InputLabel>
            <Select
              value={settings.transcriberType || ''}
              label="Transcriber Type"
              onChange={(e) => handleSettingChange('transcriberType', e.target.value)}
              disabled={!hasWebhookConfig}
            >
              <MenuItem value="">None</MenuItem>
              <MenuItem value="GOOGLE">Google</MenuItem>
              <MenuItem value="ORACLE_CLOUD_AI_SPEECH">Oracle Cloud AI Speech</MenuItem>
              <MenuItem value="EGHT_WHISPER">Eight Whisper</MenuItem>
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Outbound Phone Number"
            value={settings.outboundPhoneNo || ''}
            onChange={(e) => handleSettingChange('outboundPhoneNo', e.target.value)}
            sx={{ mb: 3 }}
            disabled={!hasWebhookConfig}
          />

          <Alert severity="info" sx={{ mt: 2 }}>
            Settings are automatically saved when you make changes. No manual save required.
          </Alert>
        </CardContent>
      </Card>

      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <Typography variant="h6">
              Custom Settings
            </Typography>
            <IconButton
              size="small"
              onClick={() => setConfigOverridesExpanded(!configOverridesExpanded)}
              sx={{
                transition: 'transform 0.2s',
                transform: configOverridesExpanded ? 'rotate(180deg)' : 'rotate(0deg)'
              }}
              title="Add custom settings for SETTINGS_PROVISIONING response"
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
                Add custom settings that will be included in the SETTINGS_PROVISIONING webhook response alongside the room settings above.
              </Typography>

              <Stack spacing={1}>
                {configOverrides.map((override) => (
                  <Stack key={override.id} direction="row" spacing={1} alignItems="center">
                    <TextField
                      size="small"
                      label="Setting Key"
                      value={override.key}
                      onChange={(e) => updateConfigOverride(override.id, 'key', e.target.value)}
                      placeholder="e.g. customFeatureEnabled"
                      sx={{ flex: 1 }}
                    />
                    <TextField
                      size="small"
                      label="Value"
                      value={override.value}
                      onChange={(e) => updateConfigOverride(override.id, 'value', e.target.value)}
                      placeholder="e.g. true, false, or custom value"
                      sx={{ flex: 1 }}
                    />
                    <IconButton
                      size="small"
                      onClick={() => removeConfigOverride(override.id)}
                      disabled={configOverrides.length === 1}
                      sx={{ color: 'error.main' }}
                      title="Remove this setting"
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
                  Add Setting
                </Button>
              </Stack>
            </Box>
          </Collapse>
        </CardContent>
      </Card>
    </Box>
  )
}