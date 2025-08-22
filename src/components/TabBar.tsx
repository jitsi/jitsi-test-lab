import React from 'react';
import { 
    Box, 
    Tab, 
    Tabs, 
    IconButton,
    Typography,
    Chip
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { useTabsContext } from '../contexts/TabsContext';

export const TabBar: React.FC = () => {
    const { tabs, activeTabId, setActiveTab, closeTab } = useTabsContext();

    const handleTabChange = (event: React.SyntheticEvent, newValue: string) => {
        setActiveTab(newValue);
    };

    const handleCloseTab = (tabId: string, event: React.MouseEvent) => {
        event.stopPropagation();
        closeTab(tabId);
    };

    const getRoleColor = (role?: string) => {
        switch (role) {
            case 'moderator': return 'success';
            case 'visitor': return 'warning';
            default: return 'default';
        }
    };

    const getRoleLabel = (role?: string) => {
        switch (role) {
            case 'moderator': return 'MOD';
            case 'visitor': return 'VIS';
            default: return 'REG';
        }
    };

    return (
        <Box sx={{ 
            borderBottom: 1, 
            borderColor: 'divider',
            bgcolor: 'background.paper',
            px: 1
        }}>
            <Box sx={{ display: 'flex', alignItems: 'stretch' }}>
                <Tabs
                    value={activeTabId || false}
                    onChange={handleTabChange}
                    variant="scrollable"
                    scrollButtons="auto"
                    sx={{
                        flexGrow: 1,
                        '& .MuiTab-root': {
                            minHeight: 48,
                            textTransform: 'none'
                        }
                    }}
                >
                    {tabs.map((tab) => (
                        <Tab
                            key={tab.id}
                            value={tab.id}
                            label={
                                <Box sx={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: 1,
                                    maxWidth: 180,
                                    pr: 1
                                }}>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                        <Typography variant="body2" sx={{ 
                                            fontWeight: 'medium',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                            maxWidth: 100
                                        }}>
                                            {tab.title}
                                        </Typography>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                            <Chip
                                                label={getRoleLabel(tab.userRole)}
                                                size="small"
                                                color={getRoleColor(tab.userRole) as any}
                                                variant="outlined"
                                                sx={{ 
                                                    height: 16, 
                                                    fontSize: '0.65rem',
                                                    '& .MuiChip-label': { px: 0.5 }
                                                }}
                                            />
                                            <Typography variant="caption" color="text.secondary">
                                                {tab.room}
                                            </Typography>
                                        </Box>
                                    </Box>
                                </Box>
                            }
                        />
                    ))}
                </Tabs>
                
                {/* Close buttons positioned outside the tabs */}
                <Box sx={{ display: 'flex', alignItems: 'center', minHeight: 48 }}>
                    {tabs.map((tab, index) => (
                        <Box
                            key={`close-${tab.id}`}
                            sx={{
                                display: activeTabId === tab.id ? 'flex' : 'none',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: 32,
                                height: 48
                            }}
                        >
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
                                <CloseIcon fontSize="small" />
                            </IconButton>
                        </Box>
                    ))}
                </Box>
            </Box>
        </Box>
    );
};