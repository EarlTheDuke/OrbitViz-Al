import { useState, useEffect, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  AlertTriangle, 
  X, 
  ChevronRight,
  Clock,
  Target,
  Zap,
  RefreshCw,
  Bell,
  BellOff,
} from 'lucide-react'
import { useStore } from '../../stores/useStore'
import { 
  findCloseApproaches, 
  findAllConjunctions,
  formatDistance, 
  getRiskColor,
  calculateCollisionProbability,
} from '../../services/collisionService'
import { notificationService } from '../../services/notificationService'

export default function CollisionAlerts({ isOpen, onClose }) {
  const { filteredSatellites, selectedSatellite, setSelectedSatellite, simulationTime } = useStore()
  const [conjunctions, setConjunctions] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [alertsEnabled, setAlertsEnabled] = useState(true)
  const [viewMode, setViewMode] = useState('all') // 'all' or 'selected'
  const notifiedRef = useRef(new Set()) // Track which conjunctions we've notified about
  
  // Calculate conjunctions
  const calculateConjunctions = async () => {
    setIsLoading(true)
    
    // Use Web Worker ideally, but for now do it in main thread with timeout
    await new Promise(resolve => setTimeout(resolve, 100))
    
    let results
    if (viewMode === 'selected' && selectedSatellite) {
      results = findCloseApproaches(selectedSatellite, filteredSatellites, {
        startTime: simulationTime,
        hoursAhead: 24,
        threshold: 25,
        maxResults: 20,
      })
    } else {
      // Sample a subset of satellites for performance
      const sampleSize = Math.min(500, filteredSatellites.length)
      const sampledSatellites = filteredSatellites
        .filter(s => s.altitude && s.altitude < 2000) // Focus on LEO
        .slice(0, sampleSize)
      
      results = findAllConjunctions(sampledSatellites, {
        time: simulationTime,
        threshold: 25,
        maxResults: 20,
      })
    }
    
    setConjunctions(results)
    setLastUpdate(new Date())
    setIsLoading(false)
    
    // Send notifications for critical/high risk conjunctions (if alerts enabled)
    if (alertsEnabled && results.length > 0) {
      const criticalOrHigh = results.filter(c => c.risk === 'critical' || c.risk === 'high')
      
      criticalOrHigh.forEach(conjunction => {
        // Create unique key for this conjunction
        const key = `${conjunction.satellite1.noradId}-${conjunction.satellite2.noradId}-${conjunction.time.getTime()}`
        
        // Only notify once per conjunction
        if (!notifiedRef.current.has(key)) {
          notifiedRef.current.add(key)
          notificationService.notifyCollision(
            conjunction.satellite1.name,
            conjunction.satellite2.name,
            conjunction.distance,
            conjunction.time.toISOString(),
            conjunction.risk
          )
        }
      })
    }
  }
  
  // Calculate on open or when dependencies change
  useEffect(() => {
    if (isOpen) {
      calculateConjunctions()
    }
  }, [isOpen, viewMode, selectedSatellite])
  
  // Stats
  const stats = useMemo(() => {
    const critical = conjunctions.filter(c => c.risk === 'critical').length
    const high = conjunctions.filter(c => c.risk === 'high').length
    const moderate = conjunctions.filter(c => c.risk === 'moderate').length
    const low = conjunctions.filter(c => c.risk === 'low').length
    return { critical, high, moderate, low, total: conjunctions.length }
  }, [conjunctions])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          />
          
          {/* Panel */}
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-[450px] glass-panel-strong border-l border-space-600/50 z-50 flex flex-col"
          >
            {/* Header */}
            <div className="p-4 border-b border-space-600/50">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-cyber-orange" />
                  <h2 className="font-display font-semibold text-lg">Collision Analysis</h2>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setAlertsEnabled(!alertsEnabled)}
                    className={`p-2 rounded-lg transition-colors ${
                      alertsEnabled ? 'text-cyber-green' : 'text-space-500'
                    }`}
                  >
                    {alertsEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={onClose}
                    className="p-2 hover:bg-space-700 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              {/* View Mode Toggle */}
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode('all')}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                    viewMode === 'all'
                      ? 'bg-cyber-blue/20 text-cyber-blue border border-cyber-blue/50'
                      : 'bg-space-700 text-space-400 hover:text-white'
                  }`}
                >
                  All Conjunctions
                </button>
                <button
                  onClick={() => setViewMode('selected')}
                  disabled={!selectedSatellite}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                    viewMode === 'selected'
                      ? 'bg-cyber-purple/20 text-cyber-purple border border-cyber-purple/50'
                      : 'bg-space-700 text-space-400 hover:text-white disabled:opacity-50'
                  }`}
                >
                  Selected Satellite
                </button>
              </div>
            </div>
            
            {/* Stats Bar */}
            <div className="px-4 py-3 border-b border-space-600/50 flex items-center gap-4">
              <StatBadge label="Critical" count={stats.critical} color="red" />
              <StatBadge label="High" count={stats.high} color="orange" />
              <StatBadge label="Moderate" count={stats.moderate} color="yellow" />
              <StatBadge label="Low" count={stats.low} color="green" />
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-64">
                  <RefreshCw className="w-8 h-8 text-cyber-blue animate-spin mb-4" />
                  <p className="text-space-500">Analyzing orbital trajectories...</p>
                </div>
              ) : conjunctions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <Target className="w-12 h-12 text-cyber-green mb-4" />
                  <p className="text-lg font-semibold text-cyber-green">All Clear!</p>
                  <p className="text-space-500 text-sm mt-2">
                    No close approaches detected in the analyzed period.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {conjunctions.map((conjunction, index) => (
                    <ConjunctionCard
                      key={index}
                      conjunction={conjunction}
                      onClick={() => {
                        setSelectedSatellite(conjunction.satellite2)
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className="p-4 border-t border-space-600/50">
              <div className="flex items-center justify-between text-xs text-space-500 mb-3">
                <span>
                  {lastUpdate 
                    ? `Last updated: ${lastUpdate.toLocaleTimeString()}`
                    : 'Not yet calculated'
                  }
                </span>
                <button
                  onClick={calculateConjunctions}
                  disabled={isLoading}
                  className="flex items-center gap-1 text-cyber-blue hover:underline"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>
              <p className="text-[10px] text-space-600">
                Analysis based on simplified orbital propagation. For operational use,
                consult official sources like Space-Track.org.
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// Stat badge component
function StatBadge({ label, count, color }) {
  const colors = {
    red: 'bg-red-500/20 text-red-400',
    orange: 'bg-orange-500/20 text-orange-400',
    yellow: 'bg-yellow-500/20 text-yellow-400',
    green: 'bg-green-500/20 text-green-400',
  }
  
  return (
    <div className={`px-2 py-1 rounded text-xs font-mono ${colors[color]}`}>
      {count} {label}
    </div>
  )
}

// Conjunction card component
function ConjunctionCard({ conjunction, onClick }) {
  const { satellite1, satellite2, distance, time, risk, probability } = conjunction
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel p-4 rounded-lg cursor-pointer hover:border-cyber-blue/30 transition-all"
      onClick={onClick}
      style={{ borderLeftColor: getRiskColor(risk), borderLeftWidth: '3px' }}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span 
              className="px-2 py-0.5 rounded text-[10px] font-mono uppercase"
              style={{ 
                backgroundColor: `${getRiskColor(risk)}20`,
                color: getRiskColor(risk)
              }}
            >
              {risk} Risk
            </span>
            <span className="text-xs text-space-500">
              {(probability * 100).toFixed(4)}% probability
            </span>
          </div>
          <p className="font-semibold text-sm">{satellite1.name}</p>
          <p className="text-xs text-space-500">↔ {satellite2.name}</p>
        </div>
        <ChevronRight className="w-5 h-5 text-space-600" />
      </div>
      
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Target className="w-3 h-3 text-cyber-blue" />
          <span className="text-space-500">Distance:</span>
          <span className="font-mono text-cyber-blue">{formatDistance(distance)}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-3 h-3 text-cyber-purple" />
          <span className="text-space-500">Time:</span>
          <span className="font-mono text-cyber-purple">
            {time.toLocaleTimeString()}
          </span>
        </div>
      </div>
    </motion.div>
  )
}
