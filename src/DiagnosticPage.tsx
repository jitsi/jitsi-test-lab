import React from 'react'
import { Box, Typography, Paper } from '@mui/material'
import { useAppContext } from './App'

export function DiagnosticPage() {
  console.log('DiagnosticPage: Component rendering')
  
  let contextData = null
  let contextError = null
  
  try {
    contextData = useAppContext()
    console.log('DiagnosticPage: Context data:', contextData)
  } catch (error) {
    contextError = error
    console.error('DiagnosticPage: Context error:', error)
  }
  
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Diagnostic Information
      </Typography>
      
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6">React Component Status</Typography>
        <Typography>✅ DiagnosticPage component is rendering</Typography>
        <Typography>✅ Material-UI components are working</Typography>
        <Typography>✅ React hooks are functional</Typography>
      </Paper>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6">App Context Status</Typography>
        {contextError ? (
          <>
            <Typography color="error">❌ Context Error: {String(contextError)}</Typography>
            <Typography variant="body2" sx={{ mt: 1, fontFamily: 'monospace' }}>
              {contextError instanceof Error ? contextError.stack : 'No stack trace'}
            </Typography>
          </>
        ) : contextData ? (
          <>
            <Typography color="success.main">✅ Context is available</Typography>
            <Typography>Config: {contextData.config ? '✅ Loaded' : '❌ Not loaded'}</Typography>
            <Typography>Conferences: {contextData.conferences.size} loaded</Typography>
            <Typography>Current Conference: {contextData.currentConference}</Typography>
            <Typography>Conference Names: {Array.from(contextData.conferences.keys()).join(', ')}</Typography>
          </>
        ) : (
          <Typography color="warning.main">⚠️ Context data is null</Typography>
        )}
      </Paper>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6">Config Details</Typography>
        {contextData?.config ? (
          <Box component="pre" sx={{ fontSize: '0.8rem', overflow: 'auto' }}>
            {JSON.stringify(contextData.config, null, 2)}
          </Box>
        ) : (
          <Typography>No config available</Typography>
        )}
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6">Browser Console</Typography>
        <Typography>Check the browser console (F12 → Console) for additional logs:</Typography>
        <Typography variant="body2" sx={{ fontFamily: 'monospace', mt: 1 }}>
          • AppProvider initialization logs<br/>
          • Config loading status<br/>
          • Component render logs<br/>
          • Error messages
        </Typography>
      </Paper>
    </Box>
  )
}