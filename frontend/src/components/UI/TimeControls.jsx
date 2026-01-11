import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Clock,
  Rewind,
  FastForward,
  RotateCcw,
  Calendar,
} from 'lucide-react'
import { useStore } from '../../stores/useStore'

const SPEED_OPTIONS = [
  { label: '0.1x', value: 0.1 },
  { label: '0.5x', value: 0.5 },
  { label: '1x', value: 1 },
  { label: '2x', value: 2 },
  { label: '5x', value: 5 },
  { label: '10x', value: 10 },
  { label: '50x', value: 50 },
  { label: '100x', value: 100 },
]

export default function TimeControls() {
  const { 
    simulationTime, 
    setSimulationTime, 
    isRealTime, 
    toggleRealTime,
    animationSpeed,
    setAnimationSpeed,
  } = useStore()
  
  const [isPlaying, setIsPlaying] = useState(true)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const intervalRef = useRef(null)
  
  // Format time for display
  const formatTime = (date) => {
    return date.toISOString().replace('T', ' ').substring(0, 19) + ' UTC'
  }
  
  // Format date for input
  const formatDateForInput = (date) => {
    return date.toISOString().substring(0, 16)
  }
  
  // Handle play/pause
  const togglePlay = () => {
    setIsPlaying(!isPlaying)
    if (isRealTime) {
      toggleRealTime()
    }
  }
  
  // Step forward/backward
  const stepTime = (minutes) => {
    if (isRealTime) toggleRealTime()
    const newTime = new Date(simulationTime.getTime() + minutes * 60 * 1000)
    setSimulationTime(newTime)
  }
  
  // Reset to real time
  const resetToRealTime = () => {
    setSimulationTime(new Date())
    if (!isRealTime) toggleRealTime()
    setIsPlaying(true)
  }
  
  // Handle date input change
  const handleDateChange = (e) => {
    const newDate = new Date(e.target.value)
    if (!isNaN(newDate.getTime())) {
      if (isRealTime) toggleRealTime()
      setSimulationTime(newDate)
    }
  }
  
  // Animation loop for non-realtime playback
  useEffect(() => {
    if (isPlaying && !isRealTime) {
      intervalRef.current = setInterval(() => {
        setSimulationTime(prev => {
          const newTime = new Date(prev.getTime() + animationSpeed * 1000)
          return newTime
        })
      }, 100)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isPlaying, isRealTime, animationSpeed, setSimulationTime])

  return (
    <motion.div
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3, delay: 0.2 }}
      className="glass-panel-strong p-3 mx-4 mb-4 border-t border-cyber-blue/30"
    >
      <div className="flex items-center justify-between gap-4">
        {/* Time Display */}
        <div className="flex items-center gap-3">
          <Clock className="w-5 h-5 text-cyber-blue" />
          <div className="relative">
            <button
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="font-mono text-sm text-cyber-blue hover:text-white transition-colors"
            >
              {formatTime(simulationTime)}
            </button>
            
            {showDatePicker && (
              <div className="absolute bottom-full left-0 mb-2 p-3 glass-panel-strong rounded-lg z-50">
                <label className="block text-xs text-space-500 mb-2">Jump to Date/Time</label>
                <input
                  type="datetime-local"
                  value={formatDateForInput(simulationTime)}
                  onChange={handleDateChange}
                  className="input-cyber text-sm"
                />
                <button
                  onClick={() => setShowDatePicker(false)}
                  className="mt-2 w-full btn-cyber text-xs"
                >
                  Close
                </button>
              </div>
            )}
          </div>
          
          {isRealTime && (
            <span className="px-2 py-0.5 text-[10px] font-mono bg-cyber-green/20 text-cyber-green rounded">
              LIVE
            </span>
          )}
        </div>
        
        {/* Playback Controls */}
        <div className="flex items-center gap-2">
          {/* Skip back 1 hour */}
          <button
            onClick={() => stepTime(-60)}
            className="p-2 hover:bg-space-700 rounded-lg transition-colors text-space-400 hover:text-cyber-blue"
            title="Back 1 hour"
          >
            <SkipBack className="w-4 h-4" />
          </button>
          
          {/* Rewind 10 min */}
          <button
            onClick={() => stepTime(-10)}
            className="p-2 hover:bg-space-700 rounded-lg transition-colors text-space-400 hover:text-cyber-blue"
            title="Back 10 minutes"
          >
            <Rewind className="w-4 h-4" />
          </button>
          
          {/* Play/Pause */}
          <button
            onClick={togglePlay}
            className={`p-3 rounded-lg transition-all ${
              isPlaying 
                ? 'bg-cyber-blue/20 text-cyber-blue border border-cyber-blue/50' 
                : 'bg-space-700 text-space-400 hover:text-white'
            }`}
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </button>
          
          {/* Forward 10 min */}
          <button
            onClick={() => stepTime(10)}
            className="p-2 hover:bg-space-700 rounded-lg transition-colors text-space-400 hover:text-cyber-blue"
            title="Forward 10 minutes"
          >
            <FastForward className="w-4 h-4" />
          </button>
          
          {/* Skip forward 1 hour */}
          <button
            onClick={() => stepTime(60)}
            className="p-2 hover:bg-space-700 rounded-lg transition-colors text-space-400 hover:text-cyber-blue"
            title="Forward 1 hour"
          >
            <SkipForward className="w-4 h-4" />
          </button>
          
          {/* Reset to real time */}
          <button
            onClick={resetToRealTime}
            className="p-2 hover:bg-space-700 rounded-lg transition-colors text-space-400 hover:text-cyber-green"
            title="Reset to real time"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
        
        {/* Speed Control */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-space-500">Speed:</span>
          <div className="flex gap-1">
            {SPEED_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setAnimationSpeed(option.value)}
                className={`px-2 py-1 text-xs font-mono rounded transition-all ${
                  animationSpeed === option.value
                    ? 'bg-cyber-purple/20 text-cyber-purple border border-cyber-purple/50'
                    : 'text-space-500 hover:text-white hover:bg-space-700'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
