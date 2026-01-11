import { create } from 'zustand'

// Helper to determine constellation from satellite name
function getConstellation(name) {
  const upperName = name.toUpperCase()
  if (upperName.includes('STARLINK')) return 'starlink'
  if (upperName.includes('ONEWEB')) return 'oneweb'
  if (upperName.includes('GPS') || upperName.includes('NAVSTAR')) return 'gps'
  if (upperName.includes('GLONASS') || upperName.includes('COSMOS')) return 'glonass'
  if (upperName.includes('GALILEO')) return 'galileo'
  if (upperName.includes('IRIDIUM')) return 'iridium'
  return 'other'
}

export const useStore = create((set, get) => ({
  // Satellite data
  satellites: [],
  filteredSatellites: [],
  selectedSatellite: null,
  hoveredSatellite: null,
  
  // Loading states
  isLoading: true,
  loadingProgress: 0,
  loadingMessage: 'Initializing...',
  
  // UI state
  sidebarOpen: true,
  searchQuery: '',
  showOrbits: true,
  showLabels: true,
  showTerminator: true,
  animationSpeed: 1,
  isPaused: false,
  isFullscreen: false,
  
  // Constellation filters
  constellationFilters: {
    starlink: true,
    oneweb: true,
    gps: true,
    glonass: true,
    galileo: true,
    iridium: true,
    other: true,
  },
  
  // Filters
  filters: {
    type: 'all', // all, satellite, debris, rocket-body, station
    minAltitude: 0,
    maxAltitude: 50000,
    showActive: true,
    showInactive: true,
  },
  
  // Camera
  cameraTarget: null,
  isTracking: false,
  cameraPosition: { x: 0, y: 0, z: 30 },
  cameraRotation: { x: 0, y: 0, z: 0 },
  
  // Time
  simulationTime: new Date(),
  currentTime: new Date(), // Alias for simulationTime
  isRealTime: true,
  
  // Stats
  stats: {
    totalObjects: 0,
    activeSatellites: 0,
    debris: 0,
    rocketBodies: 0,
    stations: 0,
  },
  
  // ISS Camera
  showISSCamera: false,
  
  // User location for flyover predictions
  userLocation: null, // { latitude, longitude, altitude }
  showGroundMarker: true,
  
  // Favorite satellites
  favoriteNoradIds: [],
  
  // WebSocket real-time updates
  wsEnabled: true, // Enable/disable WebSocket
  wsConnected: false,
  wsStatus: {
    connected: false,
    satelliteCount: 0,
    updateInterval: 1,
    isBroadcasting: false,
    lastUpdate: null,
  },
  wsPositions: {}, // Map of noradId -> position data from WebSocket
  useServerPositions: true, // Use server positions when available

  // Actions
  setSatellites: (satellites) => {
    const stats = {
      totalObjects: satellites.length,
      activeSatellites: satellites.filter(s => s.type === 'satellite' || s.type === 'payload').length,
      debris: satellites.filter(s => s.type === 'debris').length,
      rocketBodies: satellites.filter(s => s.type === 'rocket-body').length,
      stations: satellites.filter(s => s.type === 'station').length,
    }
    set({ satellites, stats, isLoading: false })
    get().applyFilters()
  },
  
  setSelectedSatellite: (satellite) => {
    set({ selectedSatellite: satellite })
    if (satellite) {
      set({ isTracking: true, cameraTarget: satellite })
    }
  },
  
  setHoveredSatellite: (satellite) => set({ hoveredSatellite: satellite }),
  
  setSearchQuery: (query) => {
    set({ searchQuery: query })
    get().applyFilters()
  },
  
  setFilter: (key, value) => {
    set(state => ({
      filters: { ...state.filters, [key]: value }
    }))
    get().applyFilters()
  },
  
  applyFilters: () => {
    const { satellites, searchQuery, filters, constellationFilters } = get()
    
    let filtered = [...satellites]
    
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(sat => 
        sat.name.toLowerCase().includes(query) ||
        sat.noradId.toString().includes(query) ||
        (sat.intlDesignator && sat.intlDesignator.toLowerCase().includes(query))
      )
    }
    
    // Type filter
    if (filters.type !== 'all') {
      filtered = filtered.filter(sat => sat.type === filters.type)
    }
    
    // Altitude filter
    filtered = filtered.filter(sat => {
      const alt = sat.altitude || 0
      return alt >= filters.minAltitude && alt <= filters.maxAltitude
    })
    
    // Constellation filter
    filtered = filtered.filter(sat => {
      const name = sat.name.toUpperCase()
      const constellation = getConstellation(name)
      return constellationFilters[constellation]
    })
    
    set({ filteredSatellites: filtered })
  },
  
  toggleSidebar: () => set(state => ({ sidebarOpen: !state.sidebarOpen })),
  toggleOrbits: () => set(state => ({ showOrbits: !state.showOrbits })),
  toggleLabels: () => set(state => ({ showLabels: !state.showLabels })),
  toggleTerminator: () => set(state => ({ showTerminator: !state.showTerminator })),
  toggleISSCamera: () => set(state => ({ showISSCamera: !state.showISSCamera })),
  
  setAnimationSpeed: (speed) => set({ animationSpeed: speed }),
  
  setLoading: (isLoading, message = '', progress = 0) => 
    set({ isLoading, loadingMessage: message, loadingProgress: progress }),
  
  setSimulationTime: (time) => set({ simulationTime: time, currentTime: time }),
  toggleRealTime: () => set(state => ({ isRealTime: !state.isRealTime })),
  togglePaused: () => set(state => ({ isPaused: !state.isPaused })),
  
  // Constellation filters
  toggleConstellation: (constellation) => {
    set(state => ({
      constellationFilters: {
        ...state.constellationFilters,
        [constellation]: !state.constellationFilters[constellation]
      }
    }))
    get().applyFilters()
  },
  
  setConstellationFilter: (constellation, value) => {
    set(state => ({
      constellationFilters: {
        ...state.constellationFilters,
        [constellation]: value
      }
    }))
    get().applyFilters()
  },
  
  // Camera position for sharing
  setCameraPosition: (position, rotation) => set({ 
    cameraPosition: position,
    cameraRotation: rotation 
  }),
  
  // Fullscreen
  toggleFullscreen: () => {
    const isFullscreen = !get().isFullscreen
    set({ isFullscreen })
    
    if (isFullscreen) {
      document.documentElement.requestFullscreen?.()
    } else {
      document.exitFullscreen?.()
    }
  },
  
  stopTracking: () => set({ isTracking: false, cameraTarget: null }),
  
  clearSelection: () => set({ 
    selectedSatellite: null, 
    isTracking: false, 
    cameraTarget: null 
  }),
  
  // User location
  setUserLocation: (location) => set({ userLocation: location }),
  toggleGroundMarker: () => set(state => ({ showGroundMarker: !state.showGroundMarker })),
  
  // Favorites
  toggleFavorite: (noradId) => set(state => {
    const favorites = state.favoriteNoradIds.includes(noradId)
      ? state.favoriteNoradIds.filter(id => id !== noradId)
      : [...state.favoriteNoradIds, noradId]
    return { favoriteNoradIds: favorites }
  }),
  
  isFavorite: (noradId) => get().favoriteNoradIds.includes(noradId),
  
  // WebSocket actions
  toggleWebSocket: () => set(state => ({ wsEnabled: !state.wsEnabled })),
  setWebSocketEnabled: (enabled) => set({ wsEnabled: enabled }),
  
  setWebSocketStatus: (status) => set(state => ({
    wsConnected: status.connected,
    wsStatus: { ...state.wsStatus, ...status },
  })),
  
  setWebSocketPositions: (positions, timestamp) => {
    // Convert positions array to a map for O(1) lookup
    const posMap = {}
    for (const pos of positions) {
      posMap[pos.noradId] = {
        x: pos.position.x,
        y: pos.position.y,
        z: pos.position.z,
        latitude: pos.latitude,
        longitude: pos.longitude,
        altitude: pos.altitude,
        velocity: pos.velocity,
      }
    }
    
    set(state => ({
      wsPositions: { ...state.wsPositions, ...posMap },
      wsStatus: { ...state.wsStatus, lastUpdate: timestamp },
    }))
    
    // Also update altitude in satellites array for display
    const { satellites } = get()
    const updatedSatellites = satellites.map(sat => {
      const wsPos = posMap[sat.noradId]
      if (wsPos) {
        return {
          ...sat,
          altitude: wsPos.altitude,
          velocity: wsPos.velocity,
          position: { x: wsPos.x, y: wsPos.y, z: wsPos.z },
        }
      }
      return sat
    })
    
    set({ satellites: updatedSatellites })
  },
  
  // Get position for a satellite (prefers WS position if available)
  getSatellitePosition: (noradId) => {
    const { wsPositions, useServerPositions, wsConnected } = get()
    if (useServerPositions && wsConnected && wsPositions[noradId]) {
      return wsPositions[noradId]
    }
    return null // Fall back to client-side calculation
  },
  
  toggleUseServerPositions: () => set(state => ({ 
    useServerPositions: !state.useServerPositions 
  })),
}))
