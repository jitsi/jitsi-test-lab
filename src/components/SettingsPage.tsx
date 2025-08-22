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
  Divider
} from '@mui/material'
import { useAppContext } from '../App'

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

  const proxy = getCurrentProxy()

  useEffect(() => {
    if (proxy?.defaultMeetingSettings) {
      setSettings(proxy.defaultMeetingSettings)
    }
  }, [proxy])

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

  // Auto-save whenever settings change
  useEffect(() => {
    const autoSave = async () => {
      if (proxy && Object.keys(settings).length > 0) {
        setSaveStatus('saving')
        try {
          proxy.defaultMeetingSettings = settings
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
  }, [settings, proxy])

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
    </Box>
  )
}