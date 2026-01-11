import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowUp, Gauge } from 'lucide-react'

export default function HoverTooltip({ satellite }) {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  
  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePos({ x: e.clientX, y: e.clientY })
    }
    
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])
  
  // Position tooltip to avoid screen edges
  const tooltipX = mousePos.x + 20
  const tooltipY = mousePos.y + 20
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.15 }}
      className="fixed z-50 pointer-events-none"
      style={{
        left: tooltipX,
        top: tooltipY,
      }}
    >
      <div className="glass-panel-strong p-3 min-w-[200px] border border-cyber-blue/30 shadow-lg shadow-cyber-blue/10">
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <div 
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: satellite.color }}
          />
          <span className="font-semibold text-sm truncate max-w-[160px]">
            {satellite.name}
          </span>
        </div>
        
        {/* Quick info */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-1">
            <ArrowUp className="w-3 h-3 text-cyber-blue" />
            <span className="text-space-400">Alt:</span>
            <span className="font-mono text-cyber-blue">
              {satellite.altitude?.toLocaleString() || '---'} km
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Gauge className="w-3 h-3 text-cyber-green" />
            <span className="text-space-400">Vel:</span>
            <span className="font-mono text-cyber-green">
              {satellite.velocity || '---'} km/s
            </span>
          </div>
        </div>
        
        {/* NORAD ID */}
        <div className="mt-2 pt-2 border-t border-space-600/50 text-xs">
          <span className="text-space-500">NORAD: </span>
          <span className="font-mono text-cyber-purple">{satellite.noradId}</span>
        </div>
        
        {/* Click hint */}
        <div className="mt-2 text-[10px] text-space-600 text-center">
          Click for details
        </div>
      </div>
    </motion.div>
  )
}
