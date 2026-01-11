import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Menu, 
  Search, 
  Satellite, 
  Activity, 
  Clock,
  Zap,
  Tag,
  RotateCcw,
  Maximize2,
  Settings,
  Download,
  AlertTriangle,
  Sun,
  Video,
  Camera,
  Share2,
  Keyboard,
  Pause,
  Play,
} from 'lucide-react'
import { useStore } from '../../stores/useStore'
import { ScreenshotButton, ShareButton } from './ShareScreenshot'
import { ISSCameraButton } from './ISSCamera'
import { FlyoverButton } from './FlyoverPredictions'
import { NotificationButton } from './NotificationCenter'
import { VRButton } from './VRButton'
import { AnomalyButton } from './AnomalyPanel'
import { LanguageButton } from './LanguageSelector'

export default function TopBar({ onSettingsClick, onExportClick, onCollisionClick, onKeyboardShortcutsClick, onFlyoverClick, onNotificationsClick, onAnomalyClick }) {
  const { 
    toggleSidebar, 
    sidebarOpen,
    searchQuery,
    setSearchQuery,
    stats,
    showOrbits,
    toggleOrbits,
    showLabels,
    toggleLabels,
    showTerminator,
    toggleTerminator,
    clearSelection,
    animationSpeed,
    setAnimationSpeed,
    isPaused,
    togglePaused,
  } = useStore()
  
  const [currentTime, setCurrentTime] = useState(new Date())
  
  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <motion.header 
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="fixed top-0 left-0 right-0 h-16 z-50 glass-panel-strong border-b border-space-600/50"
    >
      <div className="h-full px-4 flex items-center justify-between">
        {/* Left Section - Logo & Toggle */}
        <div className="flex items-center gap-4">
          <button
            onClick={toggleSidebar}
            className="p-2 hover:bg-space-700 rounded-lg transition-colors"
          >
            <Menu className="w-5 h-5 text-cyber-blue" />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <Satellite className="w-8 h-8 text-cyber-blue" />
              <motion.div
                className="absolute -top-1 -right-1 w-3 h-3 bg-cyber-green rounded-full"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </div>
            <div>
              <h1 className="font-display font-bold text-xl tracking-wider text-gradient">
                OrbitViz AI
              </h1>
              <p className="text-[10px] font-mono text-space-500 uppercase tracking-widest">
                Space Object Tracker
              </p>
            </div>
          </div>
        </div>
        
        {/* Center Section - Search */}
        <div className="flex-1 max-w-xl mx-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-space-500" />
            <input
              type="text"
              placeholder="Search satellites by name or NORAD ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-cyber pl-10 pr-4"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-space-500 hover:text-cyber-blue"
              >
                ×
              </button>
            )}
          </div>
        </div>
        
        {/* Right Section - Stats & Controls */}
        <div className="flex items-center gap-6">
          {/* Quick Stats */}
          <div className="hidden lg:flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyber-green" />
              <span className="font-mono text-cyber-green">{stats.totalObjects.toLocaleString()}</span>
              <span className="text-space-500">objects</span>
            </div>
            
            <div className="w-px h-6 bg-space-600" />
            
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyber-blue" />
              <span className="font-mono text-space-400">LIVE</span>
            </div>
          </div>
          
          {/* View Controls */}
          <div className="flex items-center gap-1">
            {/* Pause/Play */}
            <button
              onClick={togglePaused}
              className={`p-2 rounded-lg transition-colors ${
                isPaused ? 'bg-cyber-orange/20 text-cyber-orange' : 'hover:bg-space-700 text-space-500'
              }`}
              title={isPaused ? 'Resume (Space)' : 'Pause (Space)'}
            >
              {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            </button>
            
            <button
              onClick={toggleOrbits}
              className={`p-2 rounded-lg transition-colors ${
                showOrbits ? 'bg-cyber-blue/20 text-cyber-blue' : 'hover:bg-space-700 text-space-500'
              }`}
              title="Toggle Orbits (O)"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            
            <button
              onClick={toggleLabels}
              className={`p-2 rounded-lg transition-colors ${
                showLabels ? 'bg-cyber-blue/20 text-cyber-blue' : 'hover:bg-space-700 text-space-500'
              }`}
              title="Toggle Labels (L)"
            >
              <Tag className="w-4 h-4" />
            </button>
            
            <button
              onClick={toggleTerminator}
              className={`p-2 rounded-lg transition-colors ${
                showTerminator ? 'bg-cyber-purple/20 text-cyber-purple' : 'hover:bg-space-700 text-space-500'
              }`}
              title="Toggle Day/Night (T)"
            >
              <Sun className="w-4 h-4" />
            </button>
            
            <button
              onClick={clearSelection}
              className="p-2 hover:bg-space-700 rounded-lg transition-colors text-space-500 hover:text-cyber-blue"
              title="Reset View"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            
            <div className="w-px h-6 bg-space-600 mx-1" />
            
            {/* Flyover Predictions */}
            <FlyoverButton onClick={onFlyoverClick} />
            
            {/* ISS Camera */}
            <ISSCameraButton />
            
            {/* Screenshot */}
            <ScreenshotButton />
            
            {/* Share */}
            <ShareButton />
            
            {/* VR/AR Mode */}
            <VRButton />
            
            {/* Notifications */}
            <NotificationButton onClick={onNotificationsClick} />
            
            <div className="w-px h-6 bg-space-600 mx-1" />
            
            {/* AI Anomaly Detection */}
            <AnomalyButton onClick={onAnomalyClick} />
            
            <button
              onClick={onCollisionClick}
              className="p-2 hover:bg-space-700 rounded-lg transition-colors text-space-500 hover:text-cyber-orange"
              title="Collision Analysis"
            >
              <AlertTriangle className="w-4 h-4" />
            </button>
            
            <button
              onClick={onExportClick}
              className="p-2 hover:bg-space-700 rounded-lg transition-colors text-space-500 hover:text-cyber-green"
              title="Export Data"
            >
              <Download className="w-4 h-4" />
            </button>
            
            <button
              onClick={onSettingsClick}
              className="p-2 hover:bg-space-700 rounded-lg transition-colors text-space-500 hover:text-cyber-purple"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
            
            <button
              onClick={onKeyboardShortcutsClick}
              className="p-2 hover:bg-space-700 rounded-lg transition-colors text-space-500 hover:text-white"
              title="Keyboard Shortcuts (?)"
            >
              <Keyboard className="w-4 h-4" />
            </button>
            
            {/* Language Selector */}
            <LanguageButton />
          </div>
          
          {/* UTC Clock */}
          <div className="flex items-center gap-2 font-mono text-sm">
            <Clock className="w-4 h-4 text-cyber-purple" />
            <span className="text-cyber-purple">
              {currentTime.toUTCString().slice(17, 25)}
            </span>
            <span className="text-space-500 text-xs">UTC</span>
          </div>
        </div>
      </div>
      
      {/* Scanline effect */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyber-blue/50 to-transparent" />
    </motion.header>
  )
}
