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
    MenuItem,
    Select,
    FormControl,
    InputLabel,
    Chip,
    IconButton,
    Tooltip
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useAppContext } from '../App';

interface JaaSPreset {
    name: string;
    domain: string;
    tenant: string;
    kid: string;
    privateKey: string;
    webhooksProxy: {
        url: string;
        sharedSecret: string;
    };
}

interface CustomConfig extends JaaSPreset {
    id: string;
    isCustom: true;
}

export function JaaSConfigPage() {
    const { config, refreshConfig } = useAppContext();
    const [selectedPreset, setSelectedPreset] = useState<string>(() => {
        try {
            return localStorage.getItem('jaas-selected-preset') || '';
        } catch {
            return '';
        }
    });
    const [presets, setPresets] = useState<JaaSPreset[]>([]);
    const [customConfigs, setCustomConfigs] = useState<CustomConfig[]>([]);
    const [editingConfig, setEditingConfig] = useState<Partial<JaaSPreset>>({});
    const [error, setError] = useState<string>('');

    // Helper function to update selected preset and save to localStorage
    const updateSelectedPreset = async (presetId: string) => {
        setSelectedPreset(presetId);
        try {
            localStorage.setItem('jaas-selected-preset', presetId);
            // Refresh the main app config to use the selected preset
            await refreshConfig();
        } catch (error) {
            console.error('Failed to save selected preset to localStorage:', error);
        }
    };

    // Load presets and custom configs on component mount
    useEffect(() => {
        loadCustomConfigs();
        
        // Load presets from config
        if (config?.presets) {
            setPresets(config.presets);
            // Set the first preset as default if no preset is selected
            if (!selectedPreset && config.presets.length > 0) {
                updateSelectedPreset(config.presets[0].name);
            }
        }
    }, [config]);

    const loadCustomConfigs = () => {
        try {
            const saved = localStorage.getItem('jaas-custom-configs');
            if (saved) {
                const parsed = JSON.parse(saved);
                setCustomConfigs(parsed);
            }
        } catch (error) {
            console.error('Error loading custom configs:', error);
        }
    };

    const saveCustomConfigs = (configs: CustomConfig[]) => {
        try {
            localStorage.setItem('jaas-custom-configs', JSON.stringify(configs));
            setCustomConfigs(configs);
        } catch (error) {
            setError('Failed to save custom configuration');
        }
    };

    const getCurrentConfig = (): JaaSPreset | null => {
        const preset = presets.find(p => p.name === selectedPreset);
        if (preset) return preset;
        
        const customConfig = customConfigs.find(c => c.id === selectedPreset);
        if (customConfig) return customConfig;
        
        return null;
    };


    const handleSaveCustomConfig = async (clearEditing = false) => {
        const configIndex = customConfigs.findIndex(c => c.id === selectedPreset);
        if (configIndex === -1) {
            setError('Custom configuration not found');
            return;
        }
        
        const updatedConfigs = [...customConfigs];
        updatedConfigs[configIndex] = {
            ...updatedConfigs[configIndex],
            ...editingConfig,
            // Ensure name is included if it was edited
            name: editingConfig.name || updatedConfigs[configIndex].name
        };
        
        saveCustomConfigs(updatedConfigs);
        if (clearEditing) {
            setEditingConfig({});
        }
        setError('');
        
        // Refresh the main app config to apply the changes immediately
        try {
            await refreshConfig();
        } catch (error) {
            console.error('Failed to refresh config after saving custom configuration:', error);
            setError('Configuration saved but failed to apply changes. Please try switching presets to refresh.');
        }
    };

    const handleDeleteCustomConfig = (configId: string) => {
        const updatedConfigs = customConfigs.filter(c => c.id !== configId);
        saveCustomConfigs(updatedConfigs);
        if (selectedPreset === configId) {
            // Switch back to first preset if deleting the currently selected custom config
            if (presets.length > 0) {
                updateSelectedPreset(presets[0].name);
            } else {
                updateSelectedPreset('');
            }
        }
    };

    const handleCopyConfig = () => {
        const currentConfig = getCurrentConfig();
        if (!currentConfig) {
            setError('No configuration available to copy');
            return;
        }
        
        const newConfig: CustomConfig = {
            ...currentConfig,
            id: Date.now().toString(),
            name: `${currentConfig.name}-copy`,
            isCustom: true
        };
        
        const updatedConfigs = [...customConfigs, newConfig];
        saveCustomConfigs(updatedConfigs);
        updateSelectedPreset(newConfig.id);
        setError('');
    };

    const handleCreateFromScratch = () => {
        // Generate a default name with suffix if needed
        let baseName = 'New Configuration';
        let configName = baseName;
        let counter = 1;
        
        // Check if name already exists and add suffix if needed
        while (customConfigs.some(config => config.name === configName) || 
               presets.some(preset => preset.name === configName)) {
            configName = `${baseName} ${counter}`;
            counter++;
        }
        
        const newConfig: CustomConfig = {
            id: Date.now().toString(),
            name: configName,
            isCustom: true,
            domain: '',
            tenant: '',
            kid: '',
            privateKey: '',
            webhooksProxy: {
                url: '',
                sharedSecret: ''
            }
        };
        
        const updatedConfigs = [...customConfigs, newConfig];
        saveCustomConfigs(updatedConfigs);
        updateSelectedPreset(newConfig.id);
        setError('');
    };

    // Calculate derived values
    const currentConfig = getCurrentConfig();
    const displayConfig = { ...currentConfig, ...editingConfig };
    const isCustomConfig = customConfigs.some(c => c.id === selectedPreset);
    const isEditing = Object.keys(editingConfig).length > 0;

    // Auto-save when editingConfig changes
    useEffect(() => {
        if (!isCustomConfig || Object.keys(editingConfig).length === 0) {
            return;
        }

        const autoSave = async () => {
            try {
                await handleSaveCustomConfig();
            } catch (error) {
                console.error('Auto-save failed:', error);
            }
        };

        // Debounce the auto-save to avoid excessive calls
        const timeoutId = setTimeout(autoSave, 500);
        return () => clearTimeout(timeoutId);
    }, [editingConfig, isCustomConfig]);

    return (
        <Box sx={{ maxWidth: 800, mx: 'auto', height: '100%', overflow: 'auto', p: 3 }}>
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Stack spacing={3}>
                        {/* Configuration Selector */}
                        <Stack direction="row" spacing={2} alignItems="center">
                            <FormControl sx={{ minWidth: 200 }}>
                                <InputLabel>Configuration</InputLabel>
                                <Select
                                    value={selectedPreset}
                                    label="Configuration"
                                    onChange={(e) => {
                                        updateSelectedPreset(e.target.value);
                                        setEditingConfig({});
                                    }}
                                >
                                    {presets.map((preset) => (
                                        <MenuItem key={preset.name} value={preset.name}>
                                            {preset.name}
                                        </MenuItem>
                                    ))}
                                    {customConfigs.map((config) => (
                                        <MenuItem key={config.id} value={config.id}>
                                            <Stack direction="row" alignItems="center" spacing={1} sx={{ width: '100%' }}>
                                                <Chip label="Custom" size="small" color="primary" variant="outlined" />
                                                <Typography>{config.name}</Typography>
                                            </Stack>
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            
                            <Button
                                variant="outlined"
                                startIcon={<AddIcon />}
                                onClick={() => handleCopyConfig()}
                            >
                                Copy
                            </Button>
                            
                            <Button
                                variant="outlined"
                                startIcon={<AddIcon />}
                                onClick={handleCreateFromScratch}
                            >
                                Create
                            </Button>
                            
                            {isCustomConfig && (
                                <Tooltip title="Delete this custom configuration">
                                    <IconButton
                                        color="error"
                                        onClick={() => handleDeleteCustomConfig(selectedPreset)}
                                    >
                                        <DeleteIcon />
                                    </IconButton>
                                </Tooltip>
                            )}
                        </Stack>

                        {error && (
                            <Alert severity="error" onClose={() => setError('')}>
                                {error}
                            </Alert>
                        )}

                        {/* Configuration Display/Editor */}
                        {displayConfig && (
                            <Stack spacing={4}>
                                {/* Configuration Name */}
                                {isCustomConfig && (
                                    <TextField
                                        label="Configuration Name"
                                        value={editingConfig.name || displayConfig.name || ''}
                                        onChange={(e) => setEditingConfig(prev => ({ ...prev, name: e.target.value }))}
                                        fullWidth
                                    />
                                )}
                                
                                {/* Environment Section */}
                                <Box>
                                    <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
                                        Environment
                                    </Typography>
                                    <Stack spacing={2}>
                                        <TextField
                                            label="Domain"
                                            value={displayConfig.domain || ''}
                                            onChange={(e) => setEditingConfig(prev => ({ ...prev, domain: e.target.value }))}
                                            disabled={!isCustomConfig}
                                            fullWidth
                                        />
                                        
                                        <TextField
                                            label="Tenant (Optional)"
                                            value={displayConfig.tenant || ''}
                                            onChange={(e) => setEditingConfig(prev => ({ ...prev, tenant: e.target.value }))}
                                            disabled={!isCustomConfig}
                                            fullWidth
                                            placeholder="Leave empty for public Jitsi Meet"
                                        />
                                    </Stack>
                                </Box>
                                
                                {/* JaaS Section */}
                                <Box>
                                    <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
                                        JaaS
                                    </Typography>
                                    <Stack spacing={2}>
                                        <TextField
                                            label="Key ID (Optional)"
                                            value={displayConfig.kid || ''}
                                            onChange={(e) => setEditingConfig(prev => ({ ...prev, kid: e.target.value }))}
                                            disabled={!isCustomConfig}
                                            fullWidth
                                            placeholder="Leave empty for anonymous access"
                                        />
                                        
                                        <TextField
                                            label="Private Key (Optional)"
                                            value={isCustomConfig && editingConfig.privateKey ? editingConfig.privateKey : (displayConfig.privateKey ? '••••••••' : '')}
                                            onChange={(e) => setEditingConfig(prev => ({ ...prev, privateKey: e.target.value }))}
                                            disabled={!isCustomConfig}
                                            multiline
                                            rows={4}
                                            fullWidth
                                            placeholder={isCustomConfig ? 'Enter private key for JaaS authentication...' : 'Private key is hidden'}
                                        />
                                        
                                        <TextField
                                            label="Webhook Proxy URL (Optional)"
                                            value={displayConfig.webhooksProxy?.url || ''}
                                            onChange={(e) => setEditingConfig(prev => ({ 
                                                ...prev, 
                                                webhooksProxy: { 
                                                    ...prev.webhooksProxy, 
                                                    url: e.target.value 
                                                } 
                                            }))}
                                            disabled={!isCustomConfig}
                                            fullWidth
                                            placeholder="Leave empty to disable webhook features"
                                        />
                                        
                                        <TextField
                                            label="Webhook Proxy Shared Secret (Optional)"
                                            value={displayConfig.webhooksProxy?.sharedSecret || ''}
                                            onChange={(e) => setEditingConfig(prev => ({ 
                                                ...prev, 
                                                webhooksProxy: { 
                                                    ...prev.webhooksProxy, 
                                                    sharedSecret: e.target.value 
                                                } 
                                            }))}
                                            disabled={!isCustomConfig}
                                            fullWidth
                                            type="password"
                                            placeholder="Required only if webhook proxy URL is specified"
                                        />
                                    </Stack>
                                </Box>
                            </Stack>
                        )}
                    </Stack>
                </CardContent>
            </Card>

        </Box>
    );
}