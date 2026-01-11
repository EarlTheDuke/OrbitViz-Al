import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Satellite, 
  Trash2, 
  Rocket, 
  Building2,
  TrendingUp,
  AlertTriangle,
  Globe2,
  Zap,
  Server,
  Brain,
} from 'lucide-react'
import { useStore } from '../../stores/useStore'
import { apiService } from '../../services/apiService'

export default function Dashboard() {
  const { stats, isLoading } = useStore()
  const [backendStatus, setBackendStatus] = useState({ connected: false, satellites: 0 })
  
  // Check backend connection periodically
  useEffect(() => {
    const checkBackend = async () => {
      try {
        const health = await apiService.healthCheck()
        setBackendStatus({ connected: true, satellites: health.satellites_loaded || 0 })
      } catch {
        setBackendStatus({ connected: false, satellites: 0 })
      }
    }
    
    checkBackend()
    const interval = setInterval(checkBackend, 30000) // Check every 30 seconds
    return () => clearInterval(interval)
  }, [])
  
  if (isLoading) return null
  
  const statCards = [
    {
      label: 'Total Objects',
      value: stats.totalObjects,
      icon: Globe2,
      color: 'cyber-blue',
      gradient: 'from-cyber-blue/20 to-cyber-purple/20',
    },
    {
      label: 'Active Satellites',
      value: stats.activeSatellites,
      icon: Satellite,
      color: 'cyber-green',
      gradient: 'from-cyber-green/20 to-cyber-blue/20',
    },
    {
      label: 'Space Stations',
      value: stats.stations,
      icon: Building2,
      color: 'cyber-orange',
      gradient: 'from-cyber-orange/20 to-cyber-pink/20',
    },
    {
      label: 'Debris',
      value: stats.debris,
      icon: Trash2,
      color: 'cyber-red',
      gradient: 'from-cyber-red/20 to-cyber-orange/20',
    },
    {
      label: 'Rocket Bodies',
      value: stats.rocketBodies,
      icon: Rocket,
      color: 'cyber-purple',
      gradient: 'from-cyber-purple/20 to-cyber-pink/20',
    },
  ]

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="glass-panel-strong border-t border-space-600/50 px-6 py-4"
    >
      <div className="flex items-center justify-between">
        {/* Stats Row */}
        <div className="flex items-center gap-4">
          {statCards.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.4 + index * 0.1 }}
              className={`stat-card bg-gradient-to-br ${stat.gradient} min-w-[140px]`}
            >
              <div className="flex items-center justify-between">
                <stat.icon className={`w-5 h-5 text-${stat.color}`} />
                <Zap className="w-3 h-3 text-space-600" />
              </div>
              <div className={`stat-value text-${stat.color}`}>
                {stat.value.toLocaleString()}
              </div>
              <div className="stat-label">{stat.label}</div>
            </motion.div>
          ))}
        </div>
        
        {/* AI Backend Status */}
        <div className="flex items-center gap-4">
          <div className="glass-panel px-4 py-3 flex items-center gap-3">
            <div className="relative">
              <Server className={`w-5 h-5 ${backendStatus.connected ? 'text-cyber-green' : 'text-space-600'}`} />
              {backendStatus.connected && (
                <motion.div
                  className="absolute -top-1 -right-1 w-2 h-2 bg-cyber-green rounded-full"
                  animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              )}
            </div>
            <div>
              <p className="text-xs font-mono text-space-500">BACKEND</p>
              <p className={`text-sm ${backendStatus.connected ? 'text-cyber-green' : 'text-space-500'}`}>
                {backendStatus.connected ? 'Connected' : 'Offline'}
              </p>
            </div>
          </div>
          
          <div className="glass-panel px-4 py-3 flex items-center gap-3">
            <div className="relative">
              <Brain className={`w-5 h-5 ${backendStatus.connected ? 'text-cyber-purple' : 'text-space-600'}`} />
              {backendStatus.connected && (
                <motion.div
                  className="absolute -top-1 -right-1 w-2 h-2 bg-cyber-purple rounded-full"
                  animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              )}
            </div>
            <div>
              <p className="text-xs font-mono text-space-500">AI PREDICTIONS</p>
              <p className={`text-sm ${backendStatus.connected ? 'text-cyber-purple' : 'text-space-500'}`}>
                {backendStatus.connected ? 'Online' : 'Start backend'}
              </p>
            </div>
          </div>
          
          <div className="glass-panel px-4 py-3 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-cyber-orange" />
            <div>
              <p className="text-xs font-mono text-space-500">CONJUNCTIONS</p>
              <p className="text-sm text-cyber-orange">Monitoring</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Bottom accent line */}
      <div className="absolute bottom-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-cyber-blue/30 to-transparent" />
    </motion.div>
  )
}
