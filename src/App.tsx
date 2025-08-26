import React, { useState, useEffect, createContext, useContext } from 'react'
import { 
  Box, 
  CssBaseline, 
  Drawer, 
  List, 
  ListItem, 
  ListItemButton, 
  ListItemIcon, 
  ListItemText, 
  Toolbar, 
  Typography,
  IconButton,
  ToggleButton,
  ToggleButtonGroup,
  Divider,
  Checkbox,
  Switch,
  FormControlLabel,
  Collapse,
  Paper,
  Button
} from '@mui/material'
import { 
  Settings, 
  Webhook, 
  Token, 
  Tab,
  Close,
  Circle,
  Cancel,
  CropFree,
  ViewColumn,
  GridView,
  ChevronLeft,
  ChevronRight,
  CloudQueue,
  ControlCamera
} from '@mui/icons-material'
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import type { Config } from './config/index';
import { loadConfig } from './config/index';
import WebhookProxy from './WebhookProxy'
import { SettingsPage } from './components/SettingsPage'
import { WebhooksPage } from './components/WebhooksPage'
import { TokensPage } from './components/TokensPage'
import { TabsPage } from './components/TabsPage'
import { TabContent } from './components/TabContent'
import { JaaSConfigPage } from './components/JaaSConfigPage'
import { IFrameControlPage } from './components/IFrameControlPage'
import { DiagnosticPage } from './DiagnosticPage'
import { TabsProvider, useTabsContext } from './contexts/TabsContext'

const drawerWidth = 240
const configPanelWidth = 350

interface ConferenceState {
  name: string;
  proxy: WebhookProxy;
}

interface AppContextType {
  config: Config | null;
  conferences: Map<string, ConferenceState>;
  currentConference: string;
  setCurrentConference: (name: string) => void;
  addConference: (name: string) => void;
  getCurrentProxy: () => WebhookProxy | null;
  refreshConfig: () => Promise<void>;
  // Join options state
  prejoinScreen: 'default' | 'on' | 'off';
  setPrejoinScreen: (value: 'default' | 'on' | 'off') => void;
  p2pSetting: 'default' | 'on' | 'off';
  setP2pSetting: (value: 'default' | 'on' | 'off') => void;
  audioSetting: 'default' | 'on' | 'off';
  setAudioSetting: (value: 'default' | 'on' | 'off') => void;
  videoSetting: 'default' | 'on' | 'off';
  setVideoSetting: (value: 'default' | 'on' | 'off') => void;
  // Token options state
  displayName: string;
  setDisplayName: (value: string) => void;
  expiration: string;
  setExpiration: (value: string) => void;
  moderator: boolean;
  setModerator: (value: boolean) => void;
  visitor: boolean;
  setVisitor: (value: boolean) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
}

const sidebarItems = [
  { text: 'Environment Config', icon: <CloudQueue />, path: '/environment-config' },
  { text: 'Room Config', icon: <Settings />, path: '/settings' },
  { text: 'Webhooks', icon: <Webhook />, path: '/webhooks' },
  { text: 'Participants', icon: <Token />, path: '/participants' },
]

function Sidebar({ 
  configPanelOpen, 
  setConfigPanelOpen, 
  selectedConfigPage, 
  setSelectedConfigPage 
}: {
  configPanelOpen: boolean;
  setConfigPanelOpen: (open: boolean) => void;
  selectedConfigPage: string | null;
  setSelectedConfigPage: (page: string | null) => void;
}) {
  console.log('Sidebar: Component rendering')
  const navigate = useNavigate()
  const location = useLocation()
  const { getCurrentProxy, config } = useAppContext()
  const { tabs, activeTabId, setActiveTab, closeTab, closeAllTabs, layoutMode, setLayoutMode, selectedTabIds, setSelectedTabIds, useTabColors, setUseTabColors } = useTabsContext()
  const [proxyStatus, setProxyStatus] = useState<string>('disconnected')
  console.log('Sidebar: Current location:', location.pathname)

  // Update proxy status periodically to reflect connection changes
  useEffect(() => {
    const updateProxyStatus = () => {
      const proxy = getCurrentProxy()
      const status = proxy?.connectionStatus || 'disconnected'
      setProxyStatus(status)
    }

    updateProxyStatus()
    const interval = setInterval(updateProxyStatus, 1000) // Check every second
    
    return () => clearInterval(interval)
  }, [getCurrentProxy])

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId)
    navigate('/tabs')
  }

  const handleCloseTab = (tabId: string, event: React.MouseEvent) => {
    event.stopPropagation()
    closeTab(tabId)
  }

  const handleTabSelection = (tabId: string, checked: boolean) => {
    if (checked) {
      // Add tab to selection - only if there's space
      const maxTabs = layoutMode === 'single' ? 1 : layoutMode === 'side-by-side' ? 2 : 4;
      const newSelection = [...selectedTabIds];
      
      if (newSelection.length < maxTabs && !newSelection.includes(tabId)) {
        newSelection.push(tabId);
        setSelectedTabIds(newSelection);
      }
      // Don't change the selection if layout is full - checkbox will revert to unchecked
    } else {
      // Remove tab from selection
      const newSelection = selectedTabIds.filter(id => id !== tabId);
      setSelectedTabIds(newSelection);
    }
  }

  const handleConfigPageClick = (path: string, text: string) => {
    if (selectedConfigPage === path) {
      // If clicking the same page, toggle the panel
      setConfigPanelOpen(!configPanelOpen);
    } else {
      // Select new page and ensure panel is open
      setSelectedConfigPage(path);
      setConfigPanelOpen(true);
    }
    // Navigate to tabs view to show the 3-panel layout
    navigate('/tabs');
  }

  const isMultiViewMode = layoutMode !== 'single';

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box' },
      }}
    >
      <Box sx={{ overflow: 'auto' }}>
        {/* Panel Header */}
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <img 
              src="./science-beaker.png" 
              alt="Jitsi Test Lab" 
              style={{ width: 24, height: 24 }}
            />
            <Typography variant="h6" component="h2" sx={{ fontWeight: 500 }}>
              Jitsi Test Lab
            </Typography>
          </Box>
        </Box>
        
        <List>
          {sidebarItems.map((item) => {
            const hasWebhookConfig = config?.webhooksProxy?.url && config?.webhooksProxy?.sharedSecret
            const isWebhooksDisabled = item.text === 'Webhooks' && !hasWebhookConfig
            
            return (
              <ListItem key={item.text} disablePadding>
                <ListItemButton 
                  selected={selectedConfigPage === item.path}
                  onClick={() => handleConfigPageClick(item.path, item.text)}
                  disabled={isWebhooksDisabled}
                  sx={{
                    ...(isWebhooksDisabled && {
                      opacity: 0.5,
                      '&.Mui-disabled': {
                        opacity: 0.5
                      }
                    })
                  }}
                >
                  <ListItemIcon sx={{ ...(isWebhooksDisabled && { opacity: 0.5 }) }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText 
                    primary={item.text} 
                    sx={{ ...(isWebhooksDisabled && { opacity: 0.5 }) }}
                  />
                  {item.text === 'Webhooks' && hasWebhookConfig && (
                    <Circle 
                      sx={{ 
                        fontSize: 12,
                        color: proxyStatus === 'connected' ? 'success.main' : 
                               proxyStatus === 'connecting' ? 'warning.main' : 'error.main',
                        ml: 1
                      }} 
                    />
                  )}
                  {item.text === 'Webhooks' && !hasWebhookConfig && (
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        ml: 1, 
                        color: 'text.secondary',
                        fontSize: '0.7rem'
                      }}
                    >
                      (config required)
                    </Typography>
                  )}
                </ListItemButton>
              </ListItem>
            )
          })}
          
          {/* Separator before Tabs */}
          <Divider sx={{ my: 1 }} />
          
          {/* iFrame Control */}
          <ListItem disablePadding>
            <ListItemButton 
              selected={selectedConfigPage === '/iframe-control'}
              onClick={() => handleConfigPageClick('/iframe-control', 'iFrame Control')}
              sx={{
                '&.Mui-selected': {
                  bgcolor: 'action.selected',
                  '&:hover': {
                    bgcolor: 'action.selected',
                  },
                },
              }}
            >
              <ListItemIcon>
                <ControlCamera />
              </ListItemIcon>
              <ListItemText primary="iFrame Control" />
            </ListItemButton>
          </ListItem>
          
          {/* Layout Mode Selector */}
          <ListItem disablePadding>
              <Box sx={{ px: 2, py: 1, width: '100%' }}>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                  Layout
                </Typography>
                <ToggleButtonGroup
                  value={layoutMode}
                  exclusive
                  onChange={(_, value) => {
                    if (value) {
                      setLayoutMode(value);
                      navigate('/tabs');
                    }
                  }}
                  size="small"
                  sx={{ 
                    '& .MuiToggleButton-root': { 
                      fontSize: '0.75rem',
                      px: 1,
                      minWidth: 60
                    }
                  }}
                >
                  <ToggleButton value="single" title="Single tab">
                    <CropFree sx={{ fontSize: 16, mr: 0.5 }} />
                    1
                  </ToggleButton>
                  <ToggleButton value="side-by-side" title="Side by side">
                    <ViewColumn sx={{ fontSize: 16, mr: 0.5 }} />
                    2
                  </ToggleButton>
                  <ToggleButton value="2x2" title="2x2 grid">
                    <GridView sx={{ fontSize: 16, mr: 0.5 }} />
                    4
                  </ToggleButton>
                </ToggleButtonGroup>
                
                <FormControlLabel
                  control={
                    <Switch
                      size="small"
                      checked={useTabColors}
                      onChange={(e) => setUseTabColors(e.target.checked)}
                    />
                  }
                  label={
                    <Typography variant="caption">
                      Use Colors
                    </Typography>
                  }
                  sx={{ mt: 1 }}
                />
                
                {tabs.length > 0 && (
                  <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    startIcon={<Cancel sx={{ fontSize: 16 }} />}
                    onClick={closeAllTabs}
                    sx={{ 
                      mt: 1,
                      fontSize: '0.75rem',
                      py: 0.5,
                      px: 1
                    }}
                  >
                    Close All
                  </Button>
                )}
              </Box>
            </ListItem>
          
          <Divider sx={{ my: 1 }} />
          
          {/* Individual Tab Items */}
          {tabs.map((tab, index) => (
            <ListItem 
              key={tab.id} 
              disablePadding 
              sx={{ 
                pl: 2,
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  width: '100%',
                  minHeight: 36,
                  borderRadius: 1,
                  ...(useTabColors && {
                    borderLeft: `4px solid ${tab.color}`,
                    pl: 1
                  }),
                  ...((location.pathname === '/tabs' || selectedConfigPage === '/iframe-control') && activeTabId === tab.id && {
                    bgcolor: useTabColors ? `${tab.color}40` : 'action.selected',
                    borderLeft: useTabColors ? `6px solid ${tab.color}` : `4px solid ${tab.color}`
                  })
                }}
              >
                {/* Clickable area for tab switching - excludes close button */}
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    flexGrow: 1,
                    py: 0.5,
                    cursor: 'pointer',
                    borderRadius: 1,
                    '&:hover': {
                      bgcolor: 'action.hover'
                    }
                  }}
                  onClick={() => handleTabClick(tab.id)}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 36, justifyContent: 'center' }}>
                    {isMultiViewMode ? (
                      <Checkbox
                        size="small"
                        checked={selectedTabIds.includes(tab.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleTabSelection(tab.id, e.target.checked);
                        }}
                        sx={{ p: 0 }}
                      />
                    ) : (
                      <Circle 
                        sx={{ 
                          fontSize: 8,
                          color: tab.connectionState === 'prejoin' ? 'grey.500' :
                                 tab.connectionState === 'joining' ? 'warning.main' :
                                 tab.connectionState === 'joined' ? 'success.main' :
                                 tab.connectionState === 'error' ? 'error.main' : 'grey.500'
                        }} 
                      />
                    )}
                  </Box>
                  <Box sx={{ flexGrow: 1, minWidth: 0, pr: 1 }}>
                    <Typography
                      variant="body2"
                      noWrap
                      sx={{ fontSize: '0.8rem' }}
                    >
                      {`${index + 1}. ${tab.displayName || 'User'} [${tab.userRole === 'moderator' ? 'M' : tab.userRole === 'visitor' ? 'V' : 'R'}]`}
                    </Typography>
                  </Box>
                </Box>
                {/* Separate close button area */}
                <Box sx={{ display: 'flex', alignItems: 'center', pl: 0.5 }}>
                  <IconButton 
                    size="small"
                    onClick={(e) => handleCloseTab(tab.id, e)}
                    sx={{ 
                      width: 20, 
                      height: 20,
                      '&:hover': {
                        bgcolor: 'error.light',
                        color: 'error.contrastText'
                      }
                    }}
                  >
                    <Close sx={{ fontSize: 12 }} />
                  </IconButton>
                </Box>
              </Box>
            </ListItem>
          ))}
        </List>
      </Box>
    </Drawer>
  )
}


function ConfigPanel({ 
  open, 
  selectedPage, 
  onToggle,
  width,
  onWidthChange
}: { 
  open: boolean; 
  selectedPage: string | null; 
  onToggle: () => void;
  width: number;
  onWidthChange: (width: number) => void;
}) {
  const [isResizing, setIsResizing] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(width);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true);
    setStartX(e.clientX);
    setStartWidth(width);
    e.preventDefault();
  };

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      const deltaX = e.clientX - startX;
      const newWidth = Math.max(250, Math.min(800, startWidth + deltaX));
      onWidthChange(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, startX, startWidth, onWidthChange]);

  const renderConfigPage = () => {
    switch (selectedPage) {
      case '/environment-config':
        return <JaaSConfigPage />;
      case '/settings':
        return <SettingsPage />;
      case '/webhooks':
        return <WebhooksPage />;
      case '/participants':
        return <TokensPage />;
      case '/iframe-control':
        return <IFrameControlPage />;
      default:
        return <Typography sx={{ p: 2 }}>Select a configuration page</Typography>;
    }
  };

  return (
    <Paper
      sx={{
        width: open ? width : 0,
        transition: isResizing ? 'none' : 'width 0.3s ease',
        overflow: 'hidden',
        borderRadius: 0,
        borderRight: '1px solid',
        borderColor: 'divider',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative'
      }}
    >
      {open && (
        <>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            p: 2, 
            borderBottom: '1px solid',
            borderColor: 'divider',
            minHeight: 64
          }}>
            <Typography variant="h6">
              {selectedPage === '/environment-config' ? 'Environment Config' :
               selectedPage === '/settings' ? 'Room Config' :
               selectedPage === '/webhooks' ? 'Webhooks' :
               selectedPage === '/participants' ? 'Participants' : 'Configuration'}
            </Typography>
            <IconButton onClick={onToggle} size="small">
              <ChevronLeft />
            </IconButton>
          </Box>
          <Box sx={{ flex: 1, overflow: 'auto' }}>
            {renderConfigPage()}
          </Box>
          {/* Resize handle */}
          <Box
            onMouseDown={handleMouseDown}
            sx={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: 4,
              height: '100%',
              cursor: 'ew-resize',
              backgroundColor: 'transparent',
              '&:hover': {
                backgroundColor: 'primary.main',
                opacity: 0.3
              },
              zIndex: 1
            }}
          />
        </>
      )}
    </Paper>
  );
}

function MainContent({ 
  configPanelOpen, 
  selectedConfigPage 
}: { 
  configPanelOpen: boolean; 
  selectedConfigPage: string | null; 
}) {
  console.log('MainContent: Component rendering')
  const location = useLocation()
  const { tabs, activeTabId, layoutMode, selectedTabIds, useTabColors } = useTabsContext()
  console.log('MainContent: Current location:', location.pathname)
  
  const isTabsPage = location.pathname === '/tabs'

  // Get layout configuration based on mode
  const getLayoutConfig = () => {
    if (layoutMode === 'single') {
      return { 
        containerStyle: { display: 'flex', flexDirection: 'column' },
        itemStyle: { flex: 1 }
      };
    } else if (layoutMode === 'side-by-side') {
      return {
        containerStyle: { display: 'flex', flexDirection: 'row' },
        itemStyle: { flex: 1, minWidth: 0 }
      };
    } else { // 2x2
      return {
        containerStyle: { 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr',
          gridTemplateRows: '1fr 1fr',
          gap: 1
        },
        itemStyle: { minWidth: 0, minHeight: 0 }
      };
    }
  };

  const layoutConfig = getLayoutConfig();

  return (
    <Box sx={{ 
      height: '100vh',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {isTabsPage ? (
        // 3-panel layout for tabs page
        <Box sx={{ 
          flexGrow: 1, 
          overflow: 'hidden', 
          position: 'relative', 
          height: '100%',
          ...layoutConfig.containerStyle
        }}>
          {/* Always render all tabs - keep iframes loaded but use visibility to show/hide */}
          {tabs.map((tab) => {
            const isDisplayed = layoutMode === 'single' 
              ? activeTabId === tab.id
              : selectedTabIds.includes(tab.id);
            
              
            if (layoutMode === 'single') {
              // Single mode: full screen positioning
              return (
                <Box
                  key={tab.id}
                  sx={{ 
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    visibility: isDisplayed ? 'visible' : 'hidden',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    ...(selectedConfigPage === '/iframe-control' && activeTabId === tab.id && useTabColors && tab.color && {
                      border: `8px solid ${tab.color}`,
                      boxShadow: `0 0 40px ${tab.color}80, inset 0 0 30px ${tab.color}20`,
                      borderRadius: '12px',
                      background: `linear-gradient(135deg, ${tab.color}15, ${tab.color}05)`,
                      transform: 'scale(1.02)',
                      zIndex: 10
                    })
                  }}
                >
                  <TabContent tab={tab} />
                </Box>
              );
            } else {
              // Multi-mode: only render displayed tabs in layout positions
              if (!isDisplayed) {
                // Hidden tab - render with absolute positioning outside layout
                return (
                  <Box
                    key={tab.id}
                    sx={{ 
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      visibility: 'hidden',
                      flexDirection: 'column',
                      overflow: 'hidden',
                      zIndex: -1
                    }}
                  >
                    <TabContent tab={tab} />
                  </Box>
                );
              } else {
                // Visible tab - render in layout grid
                return (
                  <Box
                    key={tab.id}
                    sx={{ 
                      ...layoutConfig.itemStyle,
                      border: '1px solid',
                      borderColor: 'divider',
                      flexDirection: 'column',
                      overflow: 'hidden',
                      ...(selectedConfigPage === '/iframe-control' && activeTabId === tab.id && useTabColors && tab.color && {
                        border: `6px solid ${tab.color}`,
                        boxShadow: `0 0 30px ${tab.color}80, inset 0 0 20px ${tab.color}20`,
                        borderRadius: '12px',
                        background: `linear-gradient(135deg, ${tab.color}15, ${tab.color}05)`,
                        transform: 'scale(1.01)',
                        zIndex: 10
                      })
                    }}
                  >
                    <TabContent tab={tab} />
                  </Box>
                );
              }
            }
          })}
          
          {/* Empty slots for multi-tab layouts */}
          {layoutMode !== 'single' && Array.from({ 
            length: Math.max(0, (layoutMode === 'side-by-side' ? 2 : 4) - selectedTabIds.length) 
          }).map((_, index) => (
            <Box
              key={`empty-${index}`}
              sx={{ 
                ...layoutConfig.itemStyle,
                border: '1px solid',
                borderColor: 'divider',
                backgroundColor: 'grey.50',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Typography variant="body2" color="text.secondary">
                Select a tab
              </Typography>
            </Box>
          ))}
        </Box>
      ) : (
        // Legacy routing for non-tabs pages
        <Box sx={{ 
          flexGrow: 1, 
          overflow: 'auto',
          p: 3
        }}>
          <Routes>
            <Route path="/" element={<Navigate to="/tabs" replace />} />
            <Route path="/environment-config" element={<JaaSConfigPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/webhooks" element={<WebhooksPage />} />
            <Route path="/participants" element={<TokensPage />} />
            <Route path="/iframe-control" element={<IFrameControlPage />} />
            <Route path="/tabs" element={<TabsPage />} />
            <Route path="/diagnostics" element={<DiagnosticPage />} />
          </Routes>
        </Box>
      )}
    </Box>
  )
}

function AppProvider({ children }: { children: React.ReactNode }) {
  console.log('AppProvider: Component rendering')
  const [config, setConfig] = useState<Config | null>(null)
  const [conferences, setConferences] = useState<Map<string, ConferenceState>>(new Map())
  const [currentConference, setCurrentConference] = useState<string>('test-room')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Join options state
  const [prejoinScreen, setPrejoinScreen] = useState<'default' | 'on' | 'off'>('default')
  const [p2pSetting, setP2pSetting] = useState<'default' | 'on' | 'off'>('default')
  const [audioSetting, setAudioSetting] = useState<'default' | 'on' | 'off'>('default')
  const [videoSetting, setVideoSetting] = useState<'default' | 'on' | 'off'>('default')
  
  // Token options state
  const [displayName, setDisplayName] = useState<string>('Test User')
  const [expiration, setExpiration] = useState<string>('24h')
  const [moderator, setModerator] = useState<boolean>(false)
  const [visitor, setVisitor] = useState<boolean>(false)

  console.log('AppProvider: Current state:', {
    configLoaded: !!config,
    conferenceCount: conferences.size,
    currentConference,
    isLoading,
    error
  })

  // Extract config loading logic into a separate function
  const loadActiveConfig = async () => {
    console.log('Loading configuration from config.js...')
    const loadedConfig = await loadConfig()
    
    // Check if there's a selected preset in localStorage
    let selectedPresetId: string | null = null
    try {
      selectedPresetId = localStorage.getItem('jaas-selected-preset')
    } catch {
      // Ignore localStorage errors
    }
    
    // Find the selected preset or use the active config
    let activeConfig = loadedConfig
    if (selectedPresetId && loadedConfig.presets) {
      // First check built-in presets
      const selectedPreset = loadedConfig.presets.find(preset => preset.name === selectedPresetId)
      if (selectedPreset) {
        console.log('Using selected preset:', selectedPresetId)
        activeConfig = {
          ...selectedPreset,
          presets: loadedConfig.presets
        }
      } else {
        // Check custom configs from localStorage
        try {
          const customConfigs = JSON.parse(localStorage.getItem('jaas-custom-configs') || '[]')
          const customConfig = customConfigs.find((config: any) => config.id === selectedPresetId)
          if (customConfig) {
            console.log('Using selected custom config:', selectedPresetId)
            activeConfig = {
              ...customConfig,
              presets: loadedConfig.presets
            }
          }
        } catch {
          // Ignore errors parsing custom configs
        }
      }
    }
    
    console.log('Configuration loaded:', { 
      domain: activeConfig.domain, 
      tenant: activeConfig.tenant,
      kid: activeConfig.kid,
      hasPrivateKey: !!activeConfig.privateKey,
      webhooksProxy: activeConfig.webhooksProxy,
      selectedPreset: selectedPresetId || 'default'
    })
    
    return activeConfig
  }
  
  const refreshConfig = async () => {
    try {
      const activeConfig = await loadActiveConfig()
      setConfig(activeConfig)
      
      // Update webhook proxy connections for existing conferences
      if (activeConfig.webhooksProxy) {
        const updatedConferences = new Map<string, ConferenceState>()
        conferences.forEach((conferenceState, name) => {
          // Disconnect old proxy
          conferenceState.proxy.disconnect()
          
          // Create new proxy with updated config
          const newProxy = WebhookProxy.getInstance(
            activeConfig.webhooksProxy.url,
            activeConfig.webhooksProxy.sharedSecret,
            name,
            activeConfig.tenant
          )
          newProxy.connect()
          
          updatedConferences.set(name, {
            name,
            proxy: newProxy
          })
        })
        setConferences(updatedConferences)
        
        // If there's a current conference, ensure it has the updated proxy
        if (currentConference && !updatedConferences.has(currentConference)) {
          const defaultProxy = WebhookProxy.getInstance(
            activeConfig.webhooksProxy.url,
            activeConfig.webhooksProxy.sharedSecret,
            currentConference,
            activeConfig.tenant
          )
          defaultProxy.connect()
          updatedConferences.set(currentConference, {
            name: currentConference,
            proxy: defaultProxy
          })
          setConferences(updatedConferences)
        }
      } else {
        // No webhook proxy configured, disconnect all existing proxies
        conferences.forEach((conferenceState) => {
          conferenceState.proxy.disconnect()
        })
        setConferences(new Map())
      }
    } catch (error) {
      console.error('Failed to refresh config:', error)
      throw error
    }
  }

  useEffect(() => {
    const initializeApp = async () => {
      console.log('AppProvider: useEffect starting initialization')
      setError(null)
      
      try {
        const activeConfig = await loadActiveConfig()
        setConfig(activeConfig)
          
        const newConferences = new Map<string, ConferenceState>()
        
        // Create default proxy using getInstance for deduplication (only if webhooksProxy is configured)
        if (activeConfig.webhooksProxy?.url && activeConfig.webhooksProxy?.sharedSecret) {
          const defaultProxy = WebhookProxy.getInstance(
            activeConfig.webhooksProxy.url,
            activeConfig.webhooksProxy.sharedSecret,
            'test-room',
            activeConfig.tenant
          )
          
          // Connect directly to remote proxy server
          defaultProxy.connect()
          
          newConferences.set('test-room', {
            name: 'test-room',
            proxy: defaultProxy
          })
        }
        
        setConferences(newConferences)
        setIsLoading(false)
        console.log('AppProvider: Initialization complete')
      } catch (error) {
        console.error('AppProvider: Initialization error:', error)
        setError(`Configuration loading failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
        setIsLoading(false)
      }
    }
    
    initializeApp()
  }, [])

  const handleSetCurrentConference = (name: string) => {
    console.log('handleSetCurrentConference called with:', name, 'conferences has:', conferences.has(name))
    if (conferences.has(name)) {
      console.log('Setting current conference to:', name)
      setCurrentConference(name)
    } else {
      console.log('Conference not found in map:', name, 'Available conferences:', Array.from(conferences.keys()))
    }
  }

  const handleAddConference = (name: string) => {
    console.log('handleAddConference called with:', name, 'exists:', conferences.has(name), 'config:', !!config)
    if (!conferences.has(name) && config) {
      // Disconnect the current proxy immediately before creating new one
      const currentProxy = getCurrentProxy()
      if (currentProxy) {
        console.log('Disconnecting current proxy for:', currentConference)
        currentProxy.disconnect()
      }
      
      if (!config.webhooksProxy?.url || !config.webhooksProxy?.sharedSecret) {
        console.warn('Cannot create conference: webhooksProxy not configured')
        return
      }

      const newProxy = WebhookProxy.getInstance(
        config.webhooksProxy.url,
        config.webhooksProxy.sharedSecret,
        name,
        config.tenant
      )
      
      // Connect the new proxy
      newProxy.connect()
      
      const newConferences = new Map(conferences)
      newConferences.set(name, {
        name,
        proxy: newProxy
      })
      console.log('Adding conference to map:', name, 'New conferences:', Array.from(newConferences.keys()))
      setConferences(newConferences)
      
      // Automatically set as current conference after adding
      console.log('Auto-switching to new conference:', name)
      setCurrentConference(name)
    }
  }

  const getCurrentProxy = () => {
    const conf = conferences.get(currentConference)
    return conf ? conf.proxy : null
  }

  const contextValue: AppContextType = {
    config,
    conferences,
    currentConference,
    setCurrentConference: handleSetCurrentConference,
    addConference: handleAddConference,
    getCurrentProxy,
    refreshConfig,
    // Join options
    prejoinScreen,
    setPrejoinScreen,
    p2pSetting,
    setP2pSetting,
    audioSetting,
    setAudioSetting,
    videoSetting,
    setVideoSetting,
    // Token options
    displayName,
    setDisplayName,
    expiration,
    setExpiration,
    moderator,
    setModerator,
    visitor,
    setVisitor
  }

  console.log('AppProvider: Rendering decision point:', { isLoading, error, contextValue })

  if (isLoading) {
    console.log('AppProvider: Rendering loading state')
    return (
      <div style={{ padding: 20, backgroundColor: '#f0f0f0', border: '1px solid #ccc' }}>
        <h2>Loading Configuration...</h2>
        <p>Please wait while the application initializes.</p>
        {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      </div>
    )
  }

  console.log('AppProvider: Rendering app with context')
  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  )
}

function AppLayout() {
  const location = useLocation()
  const isTabsPage = location.pathname === '/tabs'
  const [configPanelOpen, setConfigPanelOpen] = useState(false)
  const [selectedConfigPage, setSelectedConfigPage] = useState<string | null>(null)
  const [configPanelWidth, setConfigPanelWidth] = useState(800)
  
  // Handle default page setup
  useEffect(() => {
    if (location.pathname === '/tabs' && !selectedConfigPage) {
      setSelectedConfigPage('/participants');
      setConfigPanelOpen(true);
    }
  }, [location.pathname, selectedConfigPage]);
  
  // Add data attribute to body for CSS targeting
  React.useEffect(() => {
    if (isTabsPage) {
      document.body.setAttribute('data-tabs-page', 'true');
    } else {
      document.body.removeAttribute('data-tabs-page');
    }
    return () => {
      document.body.removeAttribute('data-tabs-page');
    };
  }, [isTabsPage]);
  
  return (
    <Box sx={{ 
      display: 'flex',
      width: '100vw',
      height: '100vh'
    }}>
      <CssBaseline />
      
      {/* Left Panel - Navigation */}
      <Sidebar 
        configPanelOpen={configPanelOpen}
        setConfigPanelOpen={setConfigPanelOpen}
        selectedConfigPage={selectedConfigPage}
        setSelectedConfigPage={setSelectedConfigPage}
      />
      
      {/* Middle Panel - Collapsible Config Pages */}
      {isTabsPage && (
        <ConfigPanel 
          open={configPanelOpen}
          selectedPage={selectedConfigPage}
          onToggle={() => setConfigPanelOpen(!configPanelOpen)}
          width={configPanelWidth}
          onWidthChange={setConfigPanelWidth}
        />
      )}
      
      {/* Right Panel - Main Content */}
      <Box
        component="main"
        sx={{ 
          flexGrow: 1,
          height: '100vh',
          overflow: 'hidden',
          p: isTabsPage ? 0 : 3
        }}
      >
        <MainContent 
          configPanelOpen={configPanelOpen}
          selectedConfigPage={selectedConfigPage}
        />
      </Box>
    </Box>
  )
}

function App() {
  console.log('App: Component rendering')
  return (
    <AppProvider>
      <TabsProvider>
        <Router>
          <AppLayout />
        </Router>
      </TabsProvider>
    </AppProvider>
  )
}

export default App
