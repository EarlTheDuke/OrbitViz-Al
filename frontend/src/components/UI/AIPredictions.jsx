import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Brain, 
  AlertTriangle, 
  TrendingDown, 
  Target,
  Loader2,
  RefreshCw,
  Clock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { apiService } from '../../services/apiService'

export default function AIPredictions({ satellite }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [predictions, setPredictions] = useState(null)
  const [expanded, setExpanded] = useState(true)
  const [backendAvailable, setBackendAvailable] = useState(false)

  // Check if backend is available
  useEffect(() => {
    const checkBackend = async () => {
      try {
        await apiService.healthCheck()
        setBackendAvailable(true)
      } catch {
        setBackendAvailable(false)
      }
    }
    checkBackend()
  }, [])

  // Fetch predictions when satellite changes
  useEffect(() => {
    if (satellite && backendAvailable) {
      fetchPredictions()
    }
  }, [satellite?.noradId, backendAvailable])

  const fetchPredictions = async () => {
    if (!satellite) return
    
    setLoading(true)
    setError(null)

    try {
      // Fetch collision analysis and re-entry prediction in parallel
      const [conjunctions, reentry] = await Promise.all([
        apiService.analyzeConjunctions(satellite.noradId, 24, 25).catch(() => null),
        apiService.predictReentry(satellite.noradId).catch(() => null),
      ])

      setPredictions({ conjunctions, reentry })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!backendAvailable) {
    return (
      <div className="glass-panel p-4 border-cyber-purple/30">
        <div className="flex items-center gap-2 mb-3">
          <Brain className="w-4 h-4 text-cyber-purple" />
          <h3 className="font-semibold text-sm">AI Predictions</h3>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-space-700 text-space-400">
            OFFLINE
          </span>
        </div>
        <p className="text-xs text-space-500">
          Start the Python backend for AI predictions:
        </p>
        <code className="block mt-2 p-2 bg-space-900 rounded text-xs font-mono text-cyber-blue">
          cd backend && pip install -r requirements.txt && uvicorn app.main:app
        </code>
      </div>
    )
  }

  return (
    <div className="glass-panel p-4 border-cyber-purple/30">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-cyber-purple" />
          <h3 className="font-semibold text-sm">AI Predictions</h3>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyber-purple/20 text-cyber-purple">
            LIVE
          </span>
        </div>
        <div className="flex items-center gap-2">
          {loading && <Loader2 className="w-4 h-4 animate-spin text-cyber-purple" />}
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Content */}
      {expanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className="mt-4 space-y-4"
        >
          {error ? (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
              {error}
              <button
                onClick={fetchPredictions}
                className="ml-2 text-cyber-blue hover:underline"
              >
                Retry
              </button>
            </div>
          ) : predictions ? (
            <>
              {/* Collision Risk */}
              <CollisionRiskSection data={predictions.conjunctions} />
              
              {/* Re-entry Prediction */}
              <ReentrySection data={predictions.reentry} />
            </>
          ) : (
            <div className="text-center py-4 text-space-500">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
              <p className="text-sm">Analyzing orbital data...</p>
            </div>
          )}

          {/* Refresh button */}
          <button
            onClick={fetchPredictions}
            disabled={loading}
            className="w-full btn-cyber text-xs flex items-center justify-center gap-2"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            Refresh Predictions
          </button>
        </motion.div>
      )}
    </div>
  )
}

// Collision Risk Section
function CollisionRiskSection({ data }) {
  if (!data) return null

  const { conjunctions, risk_summary } = data
  const hasRisks = conjunctions && conjunctions.length > 0

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs">
        <AlertTriangle className="w-3 h-3 text-cyber-orange" />
        <span className="text-space-400">Collision Risk (24h)</span>
      </div>

      {hasRisks ? (
        <>
          {/* Risk summary badges */}
          <div className="flex gap-2 flex-wrap">
            {risk_summary.critical > 0 && (
              <span className="px-2 py-0.5 text-[10px] font-mono bg-red-500/20 text-red-400 rounded">
                {risk_summary.critical} Critical
              </span>
            )}
            {risk_summary.high > 0 && (
              <span className="px-2 py-0.5 text-[10px] font-mono bg-orange-500/20 text-orange-400 rounded">
                {risk_summary.high} High
              </span>
            )}
            {risk_summary.moderate > 0 && (
              <span className="px-2 py-0.5 text-[10px] font-mono bg-yellow-500/20 text-yellow-400 rounded">
                {risk_summary.moderate} Moderate
              </span>
            )}
            {risk_summary.low > 0 && (
              <span className="px-2 py-0.5 text-[10px] font-mono bg-green-500/20 text-green-400 rounded">
                {risk_summary.low} Low
              </span>
            )}
          </div>

          {/* Top conjunction */}
          {conjunctions[0] && (
            <div className="p-2 bg-space-800 rounded text-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="text-space-400">Closest approach:</span>
                <span 
                  className="font-mono"
                  style={{ color: getRiskColor(conjunctions[0].risk_level) }}
                >
                  {conjunctions[0].distance_km.toFixed(2)} km
                </span>
              </div>
              <div className="text-space-500 truncate">
                with {conjunctions[0].satellite2_name}
              </div>
              <div className="text-space-600 text-[10px]">
                {new Date(conjunctions[0].time).toLocaleString()}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="p-2 bg-cyber-green/10 border border-cyber-green/30 rounded text-xs text-cyber-green">
          ✓ No close approaches detected
        </div>
      )}
    </div>
  )
}

// Re-entry Prediction Section
function ReentrySection({ data }) {
  if (!data) return null

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs">
        <TrendingDown className="w-3 h-3 text-cyber-blue" />
        <span className="text-space-400">Re-entry Prediction</span>
      </div>

      <div className="p-2 bg-space-800 rounded text-xs space-y-1">
        <div className="flex justify-between">
          <span className="text-space-400">Current altitude:</span>
          <span className="font-mono text-cyber-blue">
            {data.current_altitude_km?.toFixed(1)} km
          </span>
        </div>
        
        {data.decay_rate_km_per_day > 0 && (
          <div className="flex justify-between">
            <span className="text-space-400">Decay rate:</span>
            <span className="font-mono text-cyber-orange">
              {data.decay_rate_km_per_day.toFixed(4)} km/day
            </span>
          </div>
        )}
        
        {data.predicted_reentry_date ? (
          <div className="flex justify-between">
            <span className="text-space-400">Est. re-entry:</span>
            <span className="font-mono text-cyber-purple">
              {new Date(data.predicted_reentry_date).toLocaleDateString()}
            </span>
          </div>
        ) : (
          <div className="text-space-500">Stable orbit - no re-entry predicted</div>
        )}
        
        <div className="flex justify-between">
          <span className="text-space-400">Confidence:</span>
          <span className={`font-mono ${
            data.confidence === 'high' ? 'text-cyber-green' :
            data.confidence === 'medium' ? 'text-cyber-orange' : 'text-space-500'
          }`}>
            {data.confidence}
          </span>
        </div>
      </div>
    </div>
  )
}

function getRiskColor(risk) {
  switch (risk) {
    case 'critical': return '#ef4444'
    case 'high': return '#f59e0b'
    case 'moderate': return '#eab308'
    case 'low': return '#22c55e'
    default: return '#6b7280'
  }
}
