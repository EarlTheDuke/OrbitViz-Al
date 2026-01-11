import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Brain,
  AlertTriangle,
  AlertCircle,
  Activity,
  X,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Zap,
  Target,
  Radio,
  ChevronRight,
  Filter,
  BarChart3,
  Clock,
  Satellite,
  Shield,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react'
import { useStore } from '../../stores/useStore'
import { anomalyService } from '../../services/anomalyService'
import { notificationService } from '../../services/notificationService'

const ANOMALY_ICONS = {
  orbital_maneuver: Zap,
  altitude_deviation: TrendingDown,
  rapid_decay: AlertCircle,
  altitude_increase: TrendingUp,
  potential_tumbling: Radio,
  debris_proximity: Target,
}

const SEVERITY_COLORS = {
  critical: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/50' },
  high: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/50' },
  medium: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/50' },
  low: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/50' },
}

export default function AnomalyPanel({ isOpen, onClose }) {
  const { setSelectedSatellite, filteredSatellites } = useStore()
  
  const [loading, setLoading] = useState(false)
  const [backendAvailable, setBackendAvailable] = useState(false)
  const [activeTab, setActiveTab] = useState('recent') // recent, batch, stats
  const [recentAnomalies, setRecentAnomalies] = useState(null)
  const [batchResults, setBatchResults] = useState(null)
  const [statistics, setStatistics] = useState(null)
  const [filter, setFilter] = useState({ severity: null, type: null })
  
  // Check backend availability
  useEffect(() => {
    const checkBackend = async () => {
      const available = await anomalyService.healthCheck()
      setBackendAvailable(available)
    }
    checkBackend()
  }, [])
  
  // Load data when panel opens
  useEffect(() => {
    if (isOpen && backendAvailable) {
      loadData()
    }
  }, [isOpen, backendAvailable, activeTab])
  
  const loadData = async () => {
    setLoading(true)
    try {
      if (activeTab === 'recent') {
        const data = await anomalyService.getRecentAnomalies({
          hours: 24,
          severity: filter.severity,
          anomalyType: filter.type,
        })
        setRecentAnomalies(data)
        
        // Send notifications for critical anomalies
        const critical = data.anomalies.filter(a => a.severity === 'critical')
        if (critical.length > 0) {
          notificationService.send(
            `🚨 ${critical.length} Critical Anomalies Detected`,
            {
              body: `${critical[0].satellite_name}: ${critical[0].description}`,
              type: 'alert',
            }
          )
        }
      } else if (activeTab === 'batch') {
        const data = await anomalyService.batchAnalysis(100)
        setBatchResults(data)
      } else if (activeTab === 'stats') {
        const data = await anomalyService.getStatistics()
        setStatistics(data)
      }
    } catch (error) {
      console.error('Failed to load anomaly data:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const handleSelectSatellite = (noradId) => {
    const sat = filteredSatellites.find(s => s.noradId === noradId)
    if (sat) {
      setSelectedSatellite(sat)
      onClose()
    }
  }
  
  if (!isOpen) return null
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-space-900 border border-space-700 rounded-xl w-full max-w-3xl max-h-[85vh] 
          overflow-hidden shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-space-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyber-purple/20 rounded-lg">
              <Brain className="w-5 h-5 text-cyber-purple" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">AI Anomaly Detection</h2>
              <p className="text-sm text-space-400">ML-powered orbital behavior analysis</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {backendAvailable && (
              <span className="text-xs font-mono px-2 py-1 rounded bg-cyber-green/20 text-cyber-green">
                AI ONLINE
              </span>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-space-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-space-400" />
            </button>
          </div>
        </div>
        
        {!backendAvailable ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center">
              <Brain className="w-16 h-16 mx-auto mb-4 text-space-600" />
              <h3 className="text-lg font-semibold text-space-400 mb-2">Backend Required</h3>
              <p className="text-space-500 text-sm mb-4">
                Start the Python backend to enable AI anomaly detection
              </p>
              <code className="block p-3 bg-space-800 rounded-lg text-xs font-mono text-cyber-blue">
                cd backend && uvicorn app.main:app --reload
              </code>
            </div>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="px-6 py-2 border-b border-space-700 flex gap-2">
              {[
                { id: 'recent', label: 'Recent Anomalies', icon: AlertTriangle },
                { id: 'batch', label: 'Fleet Analysis', icon: BarChart3 },
                { id: 'stats', label: 'System Status', icon: Activity },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`px-4 py-2 text-sm rounded-lg flex items-center gap-2 transition-colors ${
                    activeTab === id
                      ? 'bg-cyber-purple/20 text-cyber-purple border border-cyber-purple/50'
                      : 'bg-space-800 text-space-400 hover:bg-space-700 border border-transparent'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
              
              <div className="flex-1" />
              
              <button
                onClick={loadData}
                disabled={loading}
                className="px-3 py-2 text-sm bg-space-800 hover:bg-space-700 rounded-lg 
                  text-space-400 flex items-center gap-2 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-cyber-purple" />
                    <p className="text-space-400">Analyzing satellite behaviors...</p>
                  </div>
                </div>
              ) : activeTab === 'recent' ? (
                <RecentAnomaliesTab 
                  data={recentAnomalies} 
                  onSelect={handleSelectSatellite}
                  filter={filter}
                  setFilter={setFilter}
                />
              ) : activeTab === 'batch' ? (
                <BatchAnalysisTab data={batchResults} onSelect={handleSelectSatellite} />
              ) : (
                <StatisticsTab data={statistics} />
              )}
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  )
}

// Recent Anomalies Tab
function RecentAnomaliesTab({ data, onSelect, filter, setFilter }) {
  if (!data) return null
  
  return (
    <div className="p-4">
      {/* Filter bar */}
      <div className="flex gap-2 mb-4">
        <select
          value={filter.severity || ''}
          onChange={(e) => setFilter(f => ({ ...f, severity: e.target.value || null }))}
          className="px-3 py-1.5 bg-space-800 border border-space-600 rounded-lg text-sm 
            text-space-300 focus:outline-none focus:border-cyber-purple"
        >
          <option value="">All Severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        
        <select
          value={filter.type || ''}
          onChange={(e) => setFilter(f => ({ ...f, type: e.target.value || null }))}
          className="px-3 py-1.5 bg-space-800 border border-space-600 rounded-lg text-sm 
            text-space-300 focus:outline-none focus:border-cyber-purple"
        >
          <option value="">All Types</option>
          <option value="orbital_maneuver">Orbital Maneuver</option>
          <option value="altitude_deviation">Altitude Deviation</option>
          <option value="rapid_decay">Rapid Decay</option>
          <option value="potential_tumbling">Potential Tumbling</option>
        </select>
      </div>
      
      {/* Anomaly list */}
      {data.anomalies.length === 0 ? (
        <div className="text-center py-12">
          <ShieldCheck className="w-12 h-12 mx-auto mb-3 text-cyber-green" />
          <p className="text-cyber-green font-semibold">All Clear</p>
          <p className="text-space-500 text-sm">No anomalies detected in the last 24 hours</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.anomalies.map((anomaly, index) => (
            <AnomalyCard 
              key={`${anomaly.norad_id}-${index}`}
              anomaly={anomaly}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// Batch Analysis Tab
function BatchAnalysisTab({ data, onSelect }) {
  if (!data) return null
  
  return (
    <div className="p-4">
      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard 
          label="Analyzed" 
          value={data.total_analyzed} 
          icon={Satellite}
          color="blue"
        />
        <StatCard 
          label="Anomalies" 
          value={data.anomalies_found} 
          icon={AlertTriangle}
          color="orange"
        />
        <StatCard 
          label="Critical" 
          value={data.by_severity?.critical || 0} 
          icon={AlertCircle}
          color="red"
        />
        <StatCard 
          label="High Risk" 
          value={data.by_severity?.high || 0} 
          icon={ShieldAlert}
          color="orange"
        />
      </div>
      
      {/* By type breakdown */}
      {data.by_type && Object.keys(data.by_type).length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-space-300 mb-3">By Type</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(data.by_type).map(([type, count]) => (
              <div 
                key={type}
                className="px-3 py-1.5 bg-space-800 rounded-lg text-sm"
              >
                <span className="text-space-400 capitalize">{type.replace(/_/g, ' ')}</span>
                <span className="ml-2 font-mono text-cyber-blue">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Top anomalies */}
      <h3 className="text-sm font-semibold text-space-300 mb-3">Top Priority Anomalies</h3>
      <div className="space-y-3">
        {data.top_anomalies.slice(0, 10).map((anomaly, index) => (
          <AnomalyCard 
            key={`${anomaly.norad_id}-${index}`}
            anomaly={anomaly}
            onSelect={onSelect}
            compact
          />
        ))}
      </div>
    </div>
  )
}

// Statistics Tab
function StatisticsTab({ data }) {
  if (!data) return null
  
  return (
    <div className="p-4">
      {/* System status */}
      <div className="flex items-center gap-3 mb-6 p-4 bg-cyber-green/10 border border-cyber-green/30 rounded-lg">
        <Shield className="w-8 h-8 text-cyber-green" />
        <div>
          <p className="font-semibold text-cyber-green">System Operational</p>
          <p className="text-sm text-space-400">All detection algorithms running normally</p>
        </div>
      </div>
      
      {/* Monitoring stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="p-4 bg-space-800 rounded-lg">
          <p className="text-xs text-space-500 uppercase mb-1">Satellites Tracked</p>
          <p className="text-2xl font-mono text-cyber-blue">
            {data.monitoring?.total_satellites_tracked?.toLocaleString() || 0}
          </p>
        </div>
        <div className="p-4 bg-space-800 rounded-lg">
          <p className="text-xs text-space-500 uppercase mb-1">Update Frequency</p>
          <p className="text-2xl font-mono text-cyber-purple">
            {data.monitoring?.update_frequency_minutes || 10} min
          </p>
        </div>
      </div>
      
      {/* Detection algorithms */}
      <h3 className="text-sm font-semibold text-space-300 mb-3">Detection Algorithms</h3>
      <div className="space-y-2 mb-6">
        {data.monitoring?.detection_algorithms?.map((algo, i) => (
          <div key={i} className="flex items-center gap-2 px-3 py-2 bg-space-800 rounded-lg">
            <div className="w-2 h-2 rounded-full bg-cyber-green" />
            <span className="text-sm text-space-300 capitalize">{algo.replace(/_/g, ' ')}</span>
          </div>
        ))}
      </div>
      
      {/* ML Models */}
      <h3 className="text-sm font-semibold text-space-300 mb-3">ML Models</h3>
      <div className="space-y-2">
        {data.ml_models && Object.entries(data.ml_models).map(([name, model]) => (
          <div key={name} className="flex items-center justify-between p-3 bg-space-800 rounded-lg">
            <div>
              <p className="text-sm font-medium text-space-200 capitalize">
                {name.replace(/_/g, ' ')}
              </p>
              <p className="text-xs text-space-500">Last updated: {model.last_updated}</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-mono text-cyber-green">{(model.accuracy * 100).toFixed(0)}%</p>
              <p className="text-xs text-space-500">accuracy</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Anomaly Card Component
function AnomalyCard({ anomaly, onSelect, compact = false }) {
  const [expanded, setExpanded] = useState(false)
  const severity = SEVERITY_COLORS[anomaly.severity] || SEVERITY_COLORS.low
  const Icon = ANOMALY_ICONS[anomaly.anomaly_type] || AlertTriangle
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-4 rounded-lg border ${severity.border} ${severity.bg} cursor-pointer
        hover:bg-opacity-30 transition-colors`}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${severity.bg}`}>
          <Icon className={`w-4 h-4 ${severity.text}`} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`px-2 py-0.5 text-[10px] font-mono uppercase rounded ${severity.bg} ${severity.text}`}>
              {anomaly.severity}
            </span>
            <span className="text-xs text-space-500 capitalize">
              {anomaly.anomaly_type.replace(/_/g, ' ')}
            </span>
          </div>
          
          <p className="font-medium text-sm text-white truncate">
            {anomaly.satellite_name}
          </p>
          
          {!compact && (
            <p className="text-xs text-space-400 mt-1 line-clamp-2">
              {anomaly.description}
            </p>
          )}
          
          <div className="flex items-center gap-3 mt-2 text-[10px] text-space-500">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {new Date(anomaly.detected_at).toLocaleString()}
            </span>
            <span>Confidence: {(anomaly.confidence * 100).toFixed(0)}%</span>
          </div>
        </div>
        
        <button
          onClick={(e) => {
            e.stopPropagation()
            onSelect(anomaly.norad_id)
          }}
          className="p-2 hover:bg-space-700 rounded-lg transition-colors"
          title="View satellite"
        >
          <ChevronRight className="w-4 h-4 text-space-500" />
        </button>
      </div>
      
      {/* Expanded details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-3 pt-3 border-t border-space-700"
          >
            <p className="text-xs text-space-400 mb-2">{anomaly.description}</p>
            
            {anomaly.details && (
              <div className="grid grid-cols-2 gap-2 text-xs">
                {Object.entries(anomaly.details).map(([key, value]) => (
                  <div key={key} className="flex justify-between p-2 bg-space-800/50 rounded">
                    <span className="text-space-500 capitalize">{key.replace(/_/g, ' ')}</span>
                    <span className="font-mono text-space-300">
                      {typeof value === 'number' ? value.toFixed(2) : String(value)}
                    </span>
                  </div>
                ))}
              </div>
            )}
            
            {anomaly.recommended_action && (
              <div className="mt-3 p-2 bg-space-800 rounded text-xs">
                <span className="text-space-500">Recommended: </span>
                <span className="text-space-300">{anomaly.recommended_action}</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// Stat Card Component
function StatCard({ label, value, icon: Icon, color }) {
  const colors = {
    blue: 'text-cyber-blue bg-cyber-blue/10',
    orange: 'text-cyber-orange bg-cyber-orange/10',
    red: 'text-red-400 bg-red-500/10',
    green: 'text-cyber-green bg-cyber-green/10',
    purple: 'text-cyber-purple bg-cyber-purple/10',
  }
  
  return (
    <div className="p-4 bg-space-800 rounded-lg">
      <div className="flex items-center gap-2 mb-2">
        <div className={`p-1.5 rounded ${colors[color]}`}>
          <Icon className="w-4 h-4" />
        </div>
        <span className="text-xs text-space-500">{label}</span>
      </div>
      <p className="text-2xl font-mono text-white">{value}</p>
    </div>
  )
}

// Export button for TopBar
export function AnomalyButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="p-2 hover:bg-space-700 rounded-lg transition-colors text-space-500 hover:text-cyber-purple"
      title="AI Anomaly Detection"
    >
      <Brain className="w-4 h-4" />
    </button>
  )
}
