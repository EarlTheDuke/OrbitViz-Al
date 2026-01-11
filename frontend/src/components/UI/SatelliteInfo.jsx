import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  X, 
  Satellite, 
  Globe2, 
  ArrowUp,
  Gauge,
  Timer,
  Compass,
  Target,
  Copy,
  Check,
  ExternalLink,
  MapPin,
} from 'lucide-react'
import { useStore } from '../../stores/useStore'
import { getGeodeticPosition, getOrbitPath } from '../../services/satelliteService'
import AIPredictions from './AIPredictions'

export default function SatelliteInfo({ satellite }) {
  const { clearSelection, simulationTime } = useStore()
  const [copied, setCopied] = useState(false)
  const [geodetic, setGeodetic] = useState(null)
  
  // Update geodetic position
  useEffect(() => {
    if (satellite?.satrec) {
      const pos = getGeodeticPosition(satellite.satrec, simulationTime || new Date())
      setGeodetic(pos)
    }
  }, [satellite, simulationTime])
  
  const copyNoradId = () => {
    navigator.clipboard.writeText(satellite.noradId.toString())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  
  const getTypeLabel = (type) => {
    switch (type) {
      case 'station': return 'Space Station'
      case 'debris': return 'Space Debris'
      case 'rocket-body': return 'Rocket Body'
      default: return 'Satellite'
    }
  }
  
  const getTypeIcon = (type) => {
    switch (type) {
      case 'station': return '🛰️'
      case 'debris': return '⚠️'
      case 'rocket-body': return '🚀'
      default: return '📡'
    }
  }

  return (
    <motion.div
      initial={{ x: 400, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 400, opacity: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="h-full glass-panel-strong border-l border-space-600/50 flex flex-col"
    >
      {/* Header */}
      <div className="p-4 border-b border-space-600/50">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center text-2xl"
              style={{ backgroundColor: `${satellite.color}20` }}
            >
              {getTypeIcon(satellite.type)}
            </div>
            <div>
              <h2 className="font-display font-bold text-lg leading-tight">
                {satellite.name}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span 
                  className="text-xs font-mono px-2 py-0.5 rounded"
                  style={{ 
                    backgroundColor: `${satellite.color}20`,
                    color: satellite.color 
                  }}
                >
                  {getTypeLabel(satellite.type)}
                </span>
              </div>
            </div>
          </div>
          
          <button
            onClick={clearSelection}
            className="p-2 hover:bg-space-700 rounded-lg transition-colors text-space-500 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon={ArrowUp}
            label="Altitude"
            value={`${satellite.altitude?.toLocaleString() || '---'} km`}
            color="cyber-blue"
          />
          <StatCard
            icon={Gauge}
            label="Velocity"
            value={`${satellite.velocity || '---'} km/s`}
            color="cyber-green"
          />
          <StatCard
            icon={Timer}
            label="Period"
            value={`${satellite.period || '---'} min`}
            color="cyber-purple"
          />
          <StatCard
            icon={Compass}
            label="Inclination"
            value={`${satellite.inclination || '---'}°`}
            color="cyber-orange"
          />
        </div>
        
        {/* Current Position */}
        <div className="glass-panel p-4 space-y-3">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-cyber-blue" />
            <h3 className="font-semibold text-sm">Current Position</h3>
          </div>
          
          {geodetic ? (
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-xs text-space-500">Latitude</p>
                <p className="font-mono text-sm text-cyber-blue">
                  {geodetic.latitude.toFixed(4)}°
                </p>
              </div>
              <div>
                <p className="text-xs text-space-500">Longitude</p>
                <p className="font-mono text-sm text-cyber-purple">
                  {geodetic.longitude.toFixed(4)}°
                </p>
              </div>
              <div>
                <p className="text-xs text-space-500">Altitude</p>
                <p className="font-mono text-sm text-cyber-green">
                  {geodetic.altitude.toFixed(1)} km
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-space-500">Calculating position...</p>
          )}
        </div>
        
        {/* Orbital Elements */}
        <div className="glass-panel p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-cyber-purple" />
            <h3 className="font-semibold text-sm">Orbital Elements</h3>
          </div>
          
          <div className="space-y-2 text-sm">
            <InfoRow label="NORAD ID" value={satellite.noradId} />
            <InfoRow label="Int'l Designator" value={satellite.intlDesignator || 'N/A'} />
            <InfoRow label="Eccentricity" value={satellite.eccentricity} />
            <InfoRow label="Mean Motion" value={`${(satellite.satrec?.no * 1440 / (2 * Math.PI)).toFixed(4)} rev/day`} />
          </div>
        </div>
        
        {/* TLE Data */}
        <div className="glass-panel p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe2 className="w-4 h-4 text-cyber-green" />
              <h3 className="font-semibold text-sm">TLE Data</h3>
            </div>
            <button
              onClick={copyNoradId}
              className="text-xs text-space-500 hover:text-cyber-blue flex items-center gap-1"
            >
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Copied!' : 'Copy ID'}
            </button>
          </div>
          
          <div className="font-mono text-xs bg-space-900 rounded p-3 overflow-x-auto">
            <p className="text-space-400">{satellite.name}</p>
            <p className="text-cyber-blue">{satellite.line1}</p>
            <p className="text-cyber-purple">{satellite.line2}</p>
          </div>
        </div>
        
        {/* AI Predictions from Backend */}
        <AIPredictions satellite={satellite} />
      </div>
      
      {/* Footer Actions */}
      <div className="p-4 border-t border-space-600/50">
        <div className="flex gap-2">
          <a
            href={`https://www.n2yo.com/satellite/?s=${satellite.noradId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-cyber flex-1 flex items-center justify-center gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            N2YO
          </a>
          <a
            href={`https://celestrak.org/satcat/records/${satellite.noradId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-cyber flex-1 flex items-center justify-center gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            CelesTrak
          </a>
        </div>
      </div>
    </motion.div>
  )
}

// Stat card component
function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className={`glass-panel p-3 border-l-2`} style={{ borderLeftColor: `var(--color-${color}, #00d4ff)` }}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-4 h-4 text-${color}`} style={{ color: `var(--color-${color}, #00d4ff)` }} />
        <span className="text-xs text-space-500">{label}</span>
      </div>
      <p className="font-mono font-semibold" style={{ color: `var(--color-${color}, #00d4ff)` }}>
        {value}
      </p>
    </div>
  )
}

// Info row component
function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-space-500">{label}</span>
      <span className="font-mono text-space-300">{value}</span>
    </div>
  )
}
