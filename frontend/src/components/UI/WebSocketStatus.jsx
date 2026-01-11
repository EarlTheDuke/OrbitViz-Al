/**
 * WebSocket Status Indicator
 * Shows real-time connection status and update frequency
 */

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Wifi, 
  WifiOff, 
  Radio, 
  RefreshCw, 
  Settings,
  X,
  ChevronDown,
  ChevronUp,
  Satellite,
  Zap,
} from 'lucide-react'
import { useStore } from '../../stores/useStore'

export default function WebSocketStatus() {
  const { 
    wsConnected, 
    wsStatus, 
    wsEnabled,
    useServerPositions,
    toggleWebSocket,
    toggleUseServerPositions,
  } = useStore()
  
  const [expanded, setExpanded] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [updateCount, setUpdateCount] = useState(0)
  
  // Track updates per second
  useEffect(() => {
    if (wsStatus.lastUpdate) {
      setUpdateCount(prev => prev + 1)
    }
  }, [wsStatus.lastUpdate])
  
  // Reset counter every second
  useEffect(() => {
    const interval = setInterval(() => {
      setUpdateCount(0)
    }, 1000)
    return () => clearInterval(interval)
  }, [])
  
  const statusColor = wsConnected 
    ? 'text-cyber-green' 
    : wsEnabled 
      ? 'text-cyber-orange' 
      : 'text-space-500'
  
  const statusBg = wsConnected 
    ? 'bg-cyber-green/10 border-cyber-green/30' 
    : wsEnabled 
      ? 'bg-cyber-orange/10 border-cyber-orange/30' 
      : 'bg-space-800/50 border-space-600/30'

  return (
    <div className="fixed bottom-24 right-4 z-40">
      <AnimatePresence>
        {/* Main Status Button */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`
            rounded-lg border backdrop-blur-sm cursor-pointer
            transition-all duration-300 ${statusBg}
          `}
        >
          {/* Compact View */}
          <div 
            className="flex items-center gap-2 px-3 py-2"
            onClick={() => setExpanded(!expanded)}
          >
            {/* Connection Icon */}
            <div className="relative">
              {wsConnected ? (
                <Wifi className={`w-4 h-4 ${statusColor}`} />
              ) : wsEnabled ? (
                <motion.div
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <RefreshCw className={`w-4 h-4 ${statusColor} animate-spin`} />
                </motion.div>
              ) : (
                <WifiOff className={`w-4 h-4 ${statusColor}`} />
              )}
              
              {/* Pulse indicator when receiving data */}
              {wsConnected && updateCount > 0 && (
                <motion.div
                  initial={{ scale: 0.5, opacity: 1 }}
                  animate={{ scale: 2, opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  className="absolute inset-0 rounded-full bg-cyber-green"
                />
              )}
            </div>
            
            {/* Status Text */}
            <div className="flex flex-col">
              <span className={`text-xs font-mono ${statusColor}`}>
                {wsConnected ? 'LIVE' : wsEnabled ? 'CONNECTING...' : 'OFFLINE'}
              </span>
              {wsConnected && (
                <span className="text-[10px] text-space-400">
                  {wsStatus.satelliteCount?.toLocaleString() || 0} sats
                </span>
              )}
            </div>
            
            {/* Expand/Collapse Icon */}
            {expanded ? (
              <ChevronDown className="w-3 h-3 text-space-500" />
            ) : (
              <ChevronUp className="w-3 h-3 text-space-500" />
            )}
          </div>
          
          {/* Expanded Details */}
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="border-t border-space-600/30 overflow-hidden"
              >
                <div className="p-3 space-y-3">
                  {/* Connection Details */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-space-400">Status</span>
                      <span className={statusColor}>
                        {wsConnected ? 'Connected' : wsEnabled ? 'Reconnecting' : 'Disabled'}
                      </span>
                    </div>
                    
                    {wsConnected && (
                      <>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-space-400">Update Rate</span>
                          <span className="text-cyber-blue font-mono">
                            {wsStatus.updateInterval || 1}s
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-space-400">Last Update</span>
                          <span className="text-space-300 font-mono">
                            {wsStatus.lastUpdate 
                              ? new Date(wsStatus.lastUpdate).toLocaleTimeString() 
                              : '---'}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-space-400">Data Source</span>
                          <span className={useServerPositions ? 'text-cyber-green' : 'text-cyber-orange'}>
                            {useServerPositions ? 'Server (SGP4)' : 'Client (satellite.js)'}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                  
                  {/* Toggle Controls */}
                  <div className="space-y-2 pt-2 border-t border-space-600/30">
                    {/* WebSocket Toggle */}
                    <button
                      onClick={toggleWebSocket}
                      className={`
                        w-full flex items-center justify-between px-2 py-1.5 rounded
                        text-xs transition-colors
                        ${wsEnabled 
                          ? 'bg-cyber-green/10 text-cyber-green hover:bg-cyber-green/20' 
                          : 'bg-space-700/50 text-space-400 hover:bg-space-700'}
                      `}
                    >
                      <span className="flex items-center gap-2">
                        <Radio className="w-3 h-3" />
                        WebSocket Updates
                      </span>
                      <span>{wsEnabled ? 'ON' : 'OFF'}</span>
                    </button>
                    
                    {/* Server Positions Toggle */}
                    {wsConnected && (
                      <button
                        onClick={toggleUseServerPositions}
                        className={`
                          w-full flex items-center justify-between px-2 py-1.5 rounded
                          text-xs transition-colors
                          ${useServerPositions 
                            ? 'bg-cyber-blue/10 text-cyber-blue hover:bg-cyber-blue/20' 
                            : 'bg-space-700/50 text-space-400 hover:bg-space-700'}
                        `}
                      >
                        <span className="flex items-center gap-2">
                          <Satellite className="w-3 h-3" />
                          Use Server Positions
                        </span>
                        <span>{useServerPositions ? 'ON' : 'OFF'}</span>
                      </button>
                    )}
                  </div>
                  
                  {/* Performance Note */}
                  {wsConnected && useServerPositions && (
                    <div className="text-[10px] text-space-500 flex items-start gap-1">
                      <Zap className="w-3 h-3 text-cyber-green flex-shrink-0 mt-0.5" />
                      <span>
                        Server calculates positions for all satellites using SGP4.
                        Lower client CPU usage.
                      </span>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
