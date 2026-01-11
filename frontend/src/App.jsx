import { useEffect, useState, Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { useStore } from './stores/useStore'
import { fetchTLEData } from './services/satelliteService'
import Scene from './components/Globe/Scene'
import Sidebar from './components/UI/Sidebar'
import TopBar from './components/UI/TopBar'
import Dashboard from './components/UI/Dashboard'
import SatelliteInfo from './components/UI/SatelliteInfo'
import LoadingScreen from './components/UI/LoadingScreen'
import HoverTooltip from './components/UI/HoverTooltip'
import TimeControls from './components/UI/TimeControls'
import SettingsPanel from './components/UI/SettingsPanel'
import ExportPanel from './components/UI/ExportPanel'
import CollisionAlerts from './components/UI/CollisionAlerts'
import ISSCamera from './components/UI/ISSCamera'
import { KeyboardShortcutsModal } from './components/UI/KeyboardShortcuts'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useWebSocket } from './hooks/useWebSocket'
import FlyoverPredictions from './components/UI/FlyoverPredictions'
import WebSocketStatus from './components/UI/WebSocketStatus'
import NotificationCenter, { NotificationToast } from './components/UI/NotificationCenter'
import AnomalyPanel from './components/UI/AnomalyPanel'

function App() {
  const { 
    setSatellites, 
    setLoading, 
    isLoading, 
    selectedSatellite,
    hoveredSatellite,
    sidebarOpen,
    isPaused,
    wsConnected,
  } = useStore()
  
  const [loadingMessage, setLoadingMessage] = useState('Initializing systems...')
  const [loadingProgress, setLoadingProgress] = useState(0)
  
  // Panel states
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [collisionOpen, setCollisionOpen] = useState(false)
  const [keyboardHelpOpen, setKeyboardHelpOpen] = useState(false)
  const [flyoverOpen, setFlyoverOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [anomalyOpen, setAnomalyOpen] = useState(false)
  
  // Enable keyboard shortcuts
  useKeyboardShortcuts()
  
  // Initialize WebSocket connection for real-time updates
  const { isConnected: wsReady, error: wsError } = useWebSocket()

  // Load satellite data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        setLoadingMessage('Connecting to satellite databases...')
        setLoadingProgress(10)
        
        const satellites = await fetchTLEData((message, progress) => {
          setLoadingMessage(message)
          setLoadingProgress(10 + progress * 0.8)
        })
        
        setLoadingMessage('Processing orbital data...')
        setLoadingProgress(95)
        
        // Small delay for visual effect
        await new Promise(resolve => setTimeout(resolve, 500))
        
        setSatellites(satellites)
        setLoadingProgress(100)
        setLoadingMessage('Systems online')
        
      } catch (error) {
        console.error('Failed to load satellite data:', error)
        setLoadingMessage('Error loading data. Using sample data...')
        
        // Load fallback sample data
        setTimeout(() => {
          setSatellites([])
          setLoading(false)
        }, 2000)
      }
    }
    
    loadData()
  }, [setSatellites, setLoading])

  return (
    <div className="w-screen h-screen bg-space-900 overflow-hidden relative">
      {/* Loading Screen */}
      {isLoading && (
        <LoadingScreen 
          message={loadingMessage} 
          progress={loadingProgress} 
        />
      )}
      
      {/* 3D Canvas */}
      <Canvas
        className="three-canvas"
        camera={{ position: [0, 0, 30], fov: 45, near: 0.1, far: 1000 }}
        gl={{ 
          antialias: true, 
          alpha: true,
          powerPreference: 'high-performance',
        }}
        dpr={[1, 2]}
      >
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>
      
      {/* UI Overlay */}
      <div className="absolute inset-0 pointer-events-none z-10">
        {/* Top Bar */}
        <div className="pointer-events-auto">
          <TopBar 
            onSettingsClick={() => setSettingsOpen(true)}
            onExportClick={() => setExportOpen(true)}
            onCollisionClick={() => setCollisionOpen(true)}
            onKeyboardShortcutsClick={() => setKeyboardHelpOpen(true)}
            onFlyoverClick={() => setFlyoverOpen(true)}
            onNotificationsClick={() => setNotificationsOpen(true)}
            onAnomalyClick={() => setAnomalyOpen(true)}
          />
        </div>
        
        {/* Main Layout */}
        <div className="flex h-full pt-16">
          {/* Left Sidebar */}
          <div className={`pointer-events-auto transition-all duration-300 ${sidebarOpen ? 'w-80' : 'w-0'}`}>
            <Sidebar />
          </div>
          
          {/* Center - Empty for 3D view */}
          <div className="flex-1" />
          
          {/* Right Panel - Selected Satellite Info */}
          {selectedSatellite && (
            <div className="pointer-events-auto w-96">
              <SatelliteInfo satellite={selectedSatellite} />
            </div>
          )}
        </div>
        
        {/* Bottom Controls */}
        <div className="absolute bottom-0 left-0 right-0 pointer-events-auto">
          <TimeControls />
          <Dashboard />
        </div>
        
        {/* Hover Tooltip */}
        {hoveredSatellite && !selectedSatellite && (
          <HoverTooltip satellite={hoveredSatellite} />
        )}
      </div>
      
      {/* Grid Overlay Effect */}
      <div className="absolute inset-0 pointer-events-none z-0 grid-overlay opacity-30" />
      
      {/* Modal Panels */}
      <SettingsPanel isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <ExportPanel isOpen={exportOpen} onClose={() => setExportOpen(false)} />
      <CollisionAlerts isOpen={collisionOpen} onClose={() => setCollisionOpen(false)} />
      <KeyboardShortcutsModal isOpen={keyboardHelpOpen} onClose={() => setKeyboardHelpOpen(false)} />
      <FlyoverPredictions isOpen={flyoverOpen} onClose={() => setFlyoverOpen(false)} />
      <NotificationCenter isOpen={notificationsOpen} onClose={() => setNotificationsOpen(false)} />
      <AnomalyPanel isOpen={anomalyOpen} onClose={() => setAnomalyOpen(false)} />
      
      {/* ISS Live Camera */}
      <ISSCamera />
      
      {/* In-app Toast Notifications */}
      <NotificationToast />
      
      {/* WebSocket Status Indicator */}
      <WebSocketStatus />
      
      {/* Pause Indicator */}
      {isPaused && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 
          bg-cyber-orange/20 border border-cyber-orange/50 rounded-lg backdrop-blur-sm">
          <span className="text-cyber-orange font-mono text-sm">⏸ SIMULATION PAUSED</span>
        </div>
      )}
    </div>
  )
}

export default App
