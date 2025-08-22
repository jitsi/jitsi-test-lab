import React, { useState } from 'react'
import { 
  AppBar, 
  Box, 
  CssBaseline, 
  Typography,
  Toolbar
} from '@mui/material'

function App() {
  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar position="fixed">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            JaaS Test Dashboard - Minimal
          </Typography>
        </Toolbar>
      </AppBar>
      <Box
        component="main"
        sx={{ 
          flexGrow: 1, 
          p: 3, 
          marginTop: '64px'
        }}
      >
        <Typography variant="h4" gutterBottom>
          Minimal Version Working
        </Typography>
        <Typography>
          This should display if React and Material-UI are working correctly.
        </Typography>
      </Box>
    </Box>
  )
}

export default App