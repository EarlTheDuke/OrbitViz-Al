import { useState, useCallback } from 'react'
import { Camera, Share2, Check, Copy, Download, Link } from 'lucide-react'
import { useStore } from '../../stores/useStore'

/**
 * Screenshot button - captures the current 3D view
 */
export function ScreenshotButton() {
  const [capturing, setCapturing] = useState(false)
  
  const takeScreenshot = useCallback(async () => {
    setCapturing(true)
    
    try {
      // Find the canvas element
      const canvas = document.querySelector('canvas')
      if (!canvas) {
        throw new Error('Canvas not found')
      }
      
      // Create a high-quality screenshot
      const dataURL = canvas.toDataURL('image/png', 1.0)
      
      // Create download link
      const link = document.createElement('a')
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      link.download = `orbitviz-ai-${timestamp}.png`
      link.href = dataURL
      link.click()
      
      // Show success feedback
      setTimeout(() => setCapturing(false), 1000)
    } catch (error) {
      console.error('Screenshot failed:', error)
      setCapturing(false)
    }
  }, [])
  
  return (
    <button
      onClick={takeScreenshot}
      disabled={capturing}
      className={`p-2 rounded-lg transition-all ${
        capturing
          ? 'bg-green-500/20 text-green-400 border border-green-500/50'
          : 'bg-space-800/50 text-space-400 hover:bg-space-700 hover:text-white border border-transparent'
      }`}
      title="Take Screenshot (PNG)"
    >
      {capturing ? (
        <Check className="w-5 h-5" />
      ) : (
        <Camera className="w-5 h-5" />
      )}
    </button>
  )
}

/**
 * Share button - copies URL with camera position encoded
 */
export function ShareButton() {
  const [copied, setCopied] = useState(false)
  const { cameraPosition, cameraRotation, selectedSatellite, filters } = useStore()
  
  const shareView = useCallback(async () => {
    try {
      // Build share URL with current state
      const params = new URLSearchParams()
      
      // Camera position (rounded for shorter URL)
      params.set('cx', cameraPosition.x.toFixed(2))
      params.set('cy', cameraPosition.y.toFixed(2))
      params.set('cz', cameraPosition.z.toFixed(2))
      
      // Selected satellite
      if (selectedSatellite) {
        params.set('sat', selectedSatellite.noradId)
      }
      
      // Filters
      if (filters.type !== 'all') {
        params.set('type', filters.type)
      }
      
      // Build URL
      const shareURL = `${window.location.origin}${window.location.pathname}?${params.toString()}`
      
      // Copy to clipboard
      await navigator.clipboard.writeText(shareURL)
      
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Share failed:', error)
    }
  }, [cameraPosition, selectedSatellite, filters])
  
  return (
    <button
      onClick={shareView}
      className={`p-2 rounded-lg transition-all ${
        copied
          ? 'bg-green-500/20 text-green-400 border border-green-500/50'
          : 'bg-space-800/50 text-space-400 hover:bg-space-700 hover:text-white border border-transparent'
      }`}
      title={copied ? 'Link Copied!' : 'Share View (Copy URL)'}
    >
      {copied ? (
        <Check className="w-5 h-5" />
      ) : (
        <Share2 className="w-5 h-5" />
      )}
    </button>
  )
}

/**
 * Share modal with more options
 */
export function ShareModal({ isOpen, onClose }) {
  const [copied, setCopied] = useState(false)
  const { cameraPosition, selectedSatellite, filters } = useStore()
  
  if (!isOpen) return null
  
  const params = new URLSearchParams()
  params.set('cx', cameraPosition.x.toFixed(2))
  params.set('cy', cameraPosition.y.toFixed(2))
  params.set('cz', cameraPosition.z.toFixed(2))
  if (selectedSatellite) {
    params.set('sat', selectedSatellite.noradId)
  }
  
  const shareURL = `${window.location.origin}${window.location.pathname}?${params.toString()}`
  
  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(shareURL)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-space-900 border border-space-700 rounded-xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Share2 className="w-5 h-5 text-accent-400" />
            Share View
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-space-700 rounded transition-colors"
          >
            <span className="text-space-400 text-xl">&times;</span>
          </button>
        </div>
        
        <p className="text-space-400 text-sm mb-4">
          Share this exact view with others. The link includes your camera position
          {selectedSatellite && ` and selected satellite (${selectedSatellite.name})`}.
        </p>
        
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={shareURL}
            readOnly
            className="flex-1 bg-space-800 border border-space-600 rounded-lg px-3 py-2 
              text-sm text-space-300 focus:outline-none focus:border-accent-500"
          />
          <button
            onClick={copyToClipboard}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${
              copied
                ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                : 'bg-accent-500 text-white hover:bg-accent-600'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy
              </>
            )}
          </button>
        </div>
        
        <div className="text-xs text-space-500">
          <strong>URL includes:</strong>
          <ul className="mt-1 list-disc list-inside">
            <li>Camera position: ({cameraPosition.x.toFixed(1)}, {cameraPosition.y.toFixed(1)}, {cameraPosition.z.toFixed(1)})</li>
            {selectedSatellite && <li>Selected: {selectedSatellite.name}</li>}
            {filters.type !== 'all' && <li>Filter: {filters.type}</li>}
          </ul>
        </div>
      </div>
    </div>
  )
}
