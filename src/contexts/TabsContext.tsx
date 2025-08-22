import React, { createContext, useContext, useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';

export interface TabData {
    id: string;
    title: string;
    jwt: string;
    domain: string;
    tenant: string;
    room: string;
    displayName?: string;
    userRole?: 'moderator' | 'visitor' | 'regular';
    skipPrejoin?: boolean;
    prejoinSetting?: 'default' | 'on' | 'off';
    p2pSetting?: 'default' | 'on' | 'off';
    audioSetting?: 'default' | 'on' | 'off';
    videoSetting?: 'default' | 'on' | 'off';
    connectionState?: 'prejoin' | 'joining' | 'joined' | 'error';
    tabNumber?: number;
    color?: string;
    configOverrides?: Array<{key: string, value: string, id: string}>;
}

export type LayoutMode = 'single' | 'side-by-side' | '2x2';

// Event logging types
export interface ApiEvent {
    tabId: string;
    eventName: string;
    data: any;
    timestamp: Date;
    id: string;
}

interface TabsContextType {
    tabs: TabData[];
    activeTabId: string | null;
    layoutMode: LayoutMode;
    selectedTabIds: string[];
    useTabColors: boolean;
    addTab: (tabData: Omit<TabData, 'id'>) => string;
    addTabBackground: (tabData: Omit<TabData, 'id'>) => string;
    closeTab: (tabId: string) => void;
    closeAllTabs: () => void;
    setActiveTab: (tabId: string) => void;
    setLayoutMode: (mode: LayoutMode) => void;
    setSelectedTabIds: (tabIds: string[]) => void;
    setUseTabColors: (useColors: boolean) => void;
    updateTabConnectionState: (tabId: string, state: 'prejoin' | 'joining' | 'joined' | 'error') => void;
    getActiveTab: () => TabData | null;
    getTabNumber: (tabId: string) => number | null;
    // API management
    registerTabApi: (tabId: string, api: any) => void;
    unregisterTabApi: (tabId: string) => void;
    getTabApi: (tabId: string) => any | null;
    // Event logging
    logApiEvent: (tabId: string, eventName: string, data: any) => void;
    getApiEvents: (tabId?: string) => ApiEvent[];
    clearApiEvents: (tabId?: string) => void;
}

const TabsContext = createContext<TabsContextType | null>(null);

export const useTabsContext = () => {
    const context = useContext(TabsContext);
    if (!context) {
        throw new Error('useTabsContext must be used within a TabsProvider');
    }
    return context;
};

interface TabsProviderProps {
    children: React.ReactNode;
}

// Predefined colors for tabs
const TAB_COLORS = [
    '#1976d2', // Blue
    '#d32f2f', // Red  
    '#388e3c', // Green
    '#f57c00', // Orange
    '#7b1fa2', // Purple
    '#00796b', // Teal
    '#c2185b', // Pink
    '#5d4037', // Brown
    '#455a64', // Blue Grey
    '#e64a19', // Deep Orange
    '#303f9f', // Indigo
    '#689f38'  // Light Green
];

export const TabsProvider: React.FC<TabsProviderProps> = ({ children }) => {
    const [tabs, setTabs] = useState<TabData[]>([]);
    const [activeTabId, setActiveTabId] = useState<string | null>(null);
    const [layoutMode, setLayoutModeState] = useState<LayoutMode>('single');
    const [selectedTabIds, setSelectedTabIds] = useState<string[]>([]);
    const [useTabColors, setUseTabColors] = useState<boolean>(true);
    const [tabApis, setTabApis] = useState<Map<string, any>>(new Map());
    const [apiEvents, setApiEvents] = useState<ApiEvent[]>([]);

    const addTab = useCallback((tabData: Omit<TabData, 'id'>) => {
        const newTabId = uuidv4();
        const newTabNumber = tabs.length + 1;
        const newColor = TAB_COLORS[tabs.length % TAB_COLORS.length];
        
        const newTab: TabData = {
            ...tabData,
            id: newTabId,
            tabNumber: newTabNumber,
            color: newColor
        };

        setTabs(prevTabs => [...prevTabs, newTab]);
        setActiveTabId(newTabId);
        
        // Auto-enable in layout if there's space
        setSelectedTabIds(prevSelected => {
            const maxTabs = layoutMode === 'single' ? 1 : layoutMode === 'side-by-side' ? 2 : 4;
            
            if (prevSelected.length < maxTabs) {
                // There's space in the current layout, add the new tab
                return [...prevSelected, newTabId];
            } else if (layoutMode === 'single') {
                // In single mode, replace the current selection
                return [newTabId];
            } else {
                // Layout is full, don't change selection
                return prevSelected;
            }
        });
        
        return newTabId;
    }, [tabs.length, layoutMode]);

    const addTabBackground = useCallback((tabData: Omit<TabData, 'id'>) => {
        const newTabId = uuidv4();
        const newTabNumber = tabs.length + 1;
        const newColor = TAB_COLORS[tabs.length % TAB_COLORS.length];
        
        const newTab: TabData = {
            ...tabData,
            id: newTabId,
            tabNumber: newTabNumber,
            color: newColor
        };

        setTabs(prevTabs => [...prevTabs, newTab]);
        // Don't change activeTabId - keep current tab active
        
        return newTabId;
    }, [tabs.length]);

    const closeTab = useCallback((tabId: string) => {
        setTabs(prevTabs => {
            const newTabs = prevTabs.filter(tab => tab.id !== tabId);
            
            // If we're closing the active tab, switch to another tab or clear active
            if (activeTabId === tabId) {
                if (newTabs.length > 0) {
                    // Set the last tab as active, or the previous one if it exists
                    const currentIndex = prevTabs.findIndex(tab => tab.id === tabId);
                    const newActiveIndex = Math.max(0, currentIndex - 1);
                    setActiveTabId(newTabs[newActiveIndex]?.id || null);
                } else {
                    setActiveTabId(null);
                }
            }
            
            return newTabs;
        });
        
        // Clean up API registry and events for this tab (after state update)
        setTabApis(prevApis => {
            const newApis = new Map(prevApis);
            newApis.delete(tabId);
            return newApis;
        });
        setApiEvents(prevEvents => prevEvents.filter(event => event.tabId !== tabId));
    }, [activeTabId]);

    const closeAllTabs = useCallback(() => {
        // Clean up all APIs and events
        setTabApis(new Map());
        setApiEvents([]);
        setTabs([]);
        setActiveTabId(null);
    }, []);

    const setActiveTab = useCallback((tabId: string) => {
        const tabExists = tabs.some(tab => tab.id === tabId);
        if (tabExists) {
            setActiveTabId(tabId);
        }
    }, [tabs]);

    const updateTabConnectionState = useCallback((tabId: string, state: 'prejoin' | 'joining' | 'joined' | 'error') => {
        setTabs(prevTabs => 
            prevTabs.map(tab => 
                tab.id === tabId 
                    ? { ...tab, connectionState: state }
                    : tab
            )
        );
    }, []);

    const getActiveTab = useCallback(() => {
        if (!activeTabId) return null;
        return tabs.find(tab => tab.id === activeTabId) || null;
    }, [tabs, activeTabId]);

    const setLayoutMode = useCallback((mode: LayoutMode) => {
        setLayoutModeState(mode);
        
        // Auto-select tabs based on layout mode
        if (mode === 'single' && activeTabId) {
            setSelectedTabIds([activeTabId]);
        } else if (mode === 'side-by-side') {
            if (tabs.length >= 2) {
                const currentIndex = activeTabId ? tabs.findIndex(tab => tab.id === activeTabId) : 0;
                const firstTab = tabs[currentIndex]?.id || tabs[0]?.id;
                const secondTab = tabs[currentIndex + 1]?.id || tabs[1]?.id || tabs[0]?.id;
                setSelectedTabIds([firstTab, secondTab].filter(Boolean));
            } else if (tabs.length === 1) {
                setSelectedTabIds([tabs[0].id]);
            }
        } else if (mode === '2x2') {
            if (tabs.length >= 4) {
                setSelectedTabIds(tabs.slice(0, 4).map(tab => tab.id));
            } else {
                setSelectedTabIds(tabs.map(tab => tab.id));
            }
        }
    }, [tabs, activeTabId]);

    const getTabNumber = useCallback((tabId: string) => {
        const tab = tabs.find(t => t.id === tabId);
        return tab?.tabNumber || null;
    }, [tabs]);

    // API management methods
    const registerTabApi = useCallback((tabId: string, api: any) => {
        setTabApis(prevApis => {
            const newApis = new Map(prevApis);
            newApis.set(tabId, api);
            return newApis;
        });
    }, []);

    const unregisterTabApi = useCallback((tabId: string) => {
        setTabApis(prevApis => {
            const newApis = new Map(prevApis);
            newApis.delete(tabId);
            return newApis;
        });
    }, []);

    const getTabApi = useCallback((tabId: string) => {
        return tabApis.get(tabId) || null;
    }, [tabApis]);

    // Event logging methods
    const logApiEvent = useCallback((tabId: string, eventName: string, data: any) => {
        const event: ApiEvent = {
            tabId,
            eventName,
            data,
            timestamp: new Date(),
            id: uuidv4()
        };
        
        setApiEvents(prevEvents => [event, ...prevEvents].slice(0, 500)); // Keep last 500 events
    }, []);

    const getApiEvents = useCallback((tabId?: string) => {
        if (!tabId) return apiEvents;
        return apiEvents.filter(event => event.tabId === tabId);
    }, [apiEvents]);

    const clearApiEvents = useCallback((tabId?: string) => {
        if (!tabId) {
            setApiEvents([]);
        } else {
            setApiEvents(prevEvents => prevEvents.filter(event => event.tabId !== tabId));
        }
    }, []);

    const contextValue: TabsContextType = {
        tabs,
        activeTabId,
        layoutMode,
        selectedTabIds,
        useTabColors,
        addTab,
        addTabBackground,
        closeTab,
        closeAllTabs,
        setActiveTab,
        setLayoutMode,
        setSelectedTabIds,
        setUseTabColors,
        updateTabConnectionState,
        getActiveTab,
        getTabNumber,
        registerTabApi,
        unregisterTabApi,
        getTabApi,
        logApiEvent,
        getApiEvents,
        clearApiEvents
    };

    return (
        <TabsContext.Provider value={contextValue}>
            {children}
        </TabsContext.Provider>
    );
};