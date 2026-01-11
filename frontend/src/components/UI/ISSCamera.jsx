import { useState } from 'react'
import { X, Maximize2, Minimize2, ExternalLink, Video, VideoOff } from 'lucide-react'
import { useStore } from '../../stores/useStore'

/**
 * ISS Live Camera Feed Component
 * Embeds NASA's live stream from the International Space Station
 */
export default function ISSCamera() {
  const { showISSCamera, toggleISSCamera } = useStore()
  const [isMinimized, setIsMinimized] = useState(false)
  const [streamType, setStreamType] = useState('live') // 'live' or 'hdev'
  
  if (!showISSCamera) return null
  
  // NASA ISS live stream URLs
  const streams = {
    live: 'https://www.youtube.com/embed/xRPTBhmcyXY?autoplay=1&mute=1',
    hdev: 'https://www.youtube.com/embed/DDU-rZs-Ic4?autoplay=1&mute=1',
  }
  
  return (
    <div
      className={`fixed z-50 bg-space-900/95 backdrop-blur-md border border-accent-500/30 
        rounded-lg shadow-2xl transition-all duration-300 ${
        isMinimized 
          ? 'bottom-4 right-4 w-64 h-12' 
          : 'bottom-20 right-4 w-[480px] h-[320px]'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-space-700">
        <div className="flex items-center gap-2">
          <Video className="w-4 h-4 text-red-500 animate-pulse" />
          <span className="text-sm font-medium text-white">ISS Live Camera</span>
          <span className="px-1.5 py-0.5 text-xs bg-red-500/20 text-red-400 rounded">
            LIVE
          </span>
        </div>
        
        <div className="flex items-center gap-1">
          {/* Stream selector */}
          {!isMinimized && (
            <select
              value={streamType}
              onChange={(e) => setStreamType(e.target.value)}
              className="text-xs bg-space-800 border border-space-600 rounded px-2 py-1 
                text-space-300 mr-2 focus:outline-none focus:border-accent-500"
            >
              <option value="live">Live Stream</option>
              <option value="hdev">HD Earth View</option>
            </select>
          )}
          
          {/* Open in new tab */}
          <a
            href="https://www.nasa.gov/nasalive"
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 hover:bg-space-700 rounded transition-colors"
            title="Open on NASA.gov"
          >
            <ExternalLink className="w-4 h-4 text-space-400" />
          </a>
          
          {/* Minimize/Maximize */}
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1.5 hover:bg-space-700 rounded transition-colors"
            title={isMinimized ? 'Maximize' : 'Minimize'}
          >
            {isMinimized ? (
              <Maximize2 className="w-4 h-4 text-space-400" />
            ) : (
              <Minimize2 className="w-4 h-4 text-space-400" />
            )}
          </button>
          
          {/* Close */}
          <button
            onClick={toggleISSCamera}
            className="p-1.5 hover:bg-red-500/20 rounded transition-colors"
            title="Close"
          >
            <X className="w-4 h-4 text-space-400 hover:text-red-400" />
          </button>
        </div>
      </div>
      
      {/* Video Content */}
      {!isMinimized && (
        <div className="relative w-full h-[calc(100%-44px)]">
          <iframe
            src={streams[streamType]}
            title="ISS Live Stream"
            className="w-full h-full rounded-b-lg"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
          
          {/* Overlay info */}
          <div className="absolute bottom-2 left-2 flex items-center gap-2 text-xs text-white/70">
            <span className="px-2 py-1 bg-black/50 rounded">
              🛰️ ~408 km altitude
            </span>
            <span className="px-2 py-1 bg-black/50 rounded">
              🌍 27,600 km/h
            </span>
          </div>
        </div>
      )}
      
      {/* Minimized state */}
      {isMinimized && (
        <div className="flex items-center justify-center h-full px-3">
          <span className="text-xs text-space-400">ISS Camera minimized</span>
        </div>
      )}
    </div>
  )
}

/**
 * Button to toggle ISS Camera
 */
export function ISSCameraButton() {
  const { showISSCamera, toggleISSCamera } = useStore()
  
  return (
    <button
      onClick={toggleISSCamera}
      className={`p-2 rounded-lg transition-all ${
        showISSCamera 
          ? 'bg-red-500/20 text-red-400 border border-red-500/50' 
          : 'bg-space-800/50 text-space-400 hover:bg-space-700 hover:text-white border border-transparent'
      }`}
      title="ISS Live Camera (NASA)"
    >
      {showISSCamera ? (
        <VideoOff className="w-5 h-5" />
      ) : (
        <Video className="w-5 h-5" />
      )}
    </button>
  )
}
