import React from 'react';
import { Box, Typography, Alert } from '@mui/material';
import { useTabsContext } from '../contexts/TabsContext';

export const TabsPage: React.FC = () => {
    const { tabs } = useTabsContext();

    // The actual tab content is now rendered persistently at the MainContent level
    // This component just shows the empty state when there are no tabs
    return tabs.length === 0 ? (
        <Box sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '100%',
            flexDirection: 'column',
            gap: 2
        }}>
            <Typography variant="h5" color="text.secondary">
                No Meeting Tabs Open
            </Typography>
            <Alert severity="info" sx={{ maxWidth: 500 }}>
                Create a JWT token on the Tokens page and click "Add Tab" to start a meeting.
            </Alert>
        </Box>
    ) : null; // Return null when there are tabs, as content is handled by MainContent
};