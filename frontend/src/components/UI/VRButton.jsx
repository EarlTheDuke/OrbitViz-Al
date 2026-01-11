import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Glasses, X, Monitor, Info, AlertCircle } from 'lucide-react'

/**
 * VR/AR Mode Button and Setup Modal
 * Provides WebXR support for immersive satellite viewing
 */
export function VRButton({ onEnterVR }) {
  const [isSupported, setIsSupported] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [xrMode, setXrMode] = useState(null) // 'vr' or 'ar'
  
  useEffect(() => {
    checkXRSupport()
  }, [])
  
  const checkXRSupport = async () => {
    if (!navigator.xr) {
      setIsSupported(false)
      return
    }
    
    try {
      const vrSupported = await navigator.xr.isSessionSupported('immersive-vr')
      const arSupported = await navigator.xr.isSessionSupported('immersive-ar')
      
      setIsSupported(vrSupported || arSupported)
      setXrMode(vrSupported ? 'vr' : arSupported ? 'ar' : null)
    } catch (err) {
      console.log('WebXR check failed:', err)
      setIsSupported(false)
    }
  }
  
  const handleClick = () => {
    if (isSupported) {
      onEnterVR?.(xrMode)
    } else {
      setModalOpen(true)
    }
  }
  
  return (
    <>
      <button
        onClick={handleClick}
        className={`p-2 rounded-lg transition-colors ${
          isSupported 
            ? 'hover:bg-cyber-purple/20 text-cyber-purple hover:text-white' 
            : 'hover:bg-space-700 text-space-500 hover:text-space-400'
        }`}
        title={isSupported ? `Enter ${xrMode?.toUpperCase()} Mode` : 'VR/AR Info'}
      >
        <Glasses className="w-4 h-4" />
      </button>
      
      <VRInfoModal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)} 
        isSupported={isSupported}
        xrMode={xrMode}
      />
    </>
  )
}

/**
 * VR Info/Setup Modal
 */
function VRInfoModal({ isOpen, onClose, isSupported, xrMode }) {
  if (!isOpen) return null
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center"
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-space-900/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative w-full max-w-md glass-panel-strong border border-space-600 
          rounded-xl overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="p-4 border-b border-space-600 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyber-purple/20 rounded-lg">
              <Glasses className="w-5 h-5 text-cyber-purple" />
            </div>
            <h2 className="font-display font-semibold">VR/AR Mode</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-space-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6">
          {isSupported ? (
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-cyber-green/20 
                flex items-center justify-center">
                <Glasses className="w-8 h-8 text-cyber-green" />
              </div>
              <h3 className="text-lg font-semibold text-cyber-green mb-2">
                WebXR Ready!
              </h3>
              <p className="text-space-400 text-sm mb-4">
                Your device supports {xrMode === 'vr' ? 'Virtual Reality' : 'Augmented Reality'} mode.
                Click below to explore the satellite visualization in immersive mode.
              </p>
              <button className="btn-cyber w-full">
                Enter {xrMode?.toUpperCase()} Mode
              </button>
            </div>
          ) : (
            <div>
              <div className="flex items-start gap-3 p-3 bg-cyber-orange/10 border border-cyber-orange/30 
                rounded-lg mb-4">
                <AlertCircle className="w-5 h-5 text-cyber-orange flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-cyber-orange">WebXR Not Available</p>
                  <p className="text-xs text-space-400 mt-1">
                    Your browser or device doesn't support WebXR immersive sessions.
                  </p>
                </div>
              </div>
              
              <h4 className="font-semibold text-sm mb-3">To use VR/AR mode:</h4>
              
              <div className="space-y-3">
                <RequirementItem 
                  title="Compatible Browser"
                  description="Use Chrome, Edge, or Firefox with WebXR support"
                />
                <RequirementItem 
                  title="VR Headset"
                  description="Meta Quest, HTC Vive, Valve Index, or Windows Mixed Reality"
                />
                <RequirementItem 
                  title="AR Device"
                  description="Mobile device with ARCore (Android) or ARKit (iOS via WebXR Viewer)"
                />
                <RequirementItem 
                  title="Secure Context"
                  description="WebXR requires HTTPS (localhost is also allowed for testing)"
                />
              </div>
              
              <div className="mt-4 p-3 bg-space-800 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="w-4 h-4 text-cyber-blue" />
                  <span className="text-sm font-medium">Quick Test</span>
                </div>
                <p className="text-xs text-space-400">
                  Try visiting this page on a VR headset browser (like Meta Quest Browser) 
                  or use the WebXR emulator extension for Chrome.
                </p>
              </div>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="px-6 py-3 border-t border-space-600 bg-space-800/50">
          <p className="text-[10px] text-space-500 text-center">
            WebXR support is experimental. Experience may vary by device.
          </p>
        </div>
      </motion.div>
    </motion.div>
  )
}

function RequirementItem({ title, description }) {
  return (
    <div className="flex items-start gap-3">
      <Monitor className="w-4 h-4 text-space-500 flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-space-500">{description}</p>
      </div>
    </div>
  )
}

export default VRButton
