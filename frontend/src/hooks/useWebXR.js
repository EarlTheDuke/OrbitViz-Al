/**
 * WebXR Hook for VR/AR Support
 * Manages XR sessions and provides state for immersive experiences
 */

import { useState, useEffect, useCallback, useRef } from 'react'

export function useWebXR() {
  const [isSupported, setIsSupported] = useState(false)
  const [supportedModes, setSupportedModes] = useState({ vr: false, ar: false })
  const [isPresenting, setIsPresenting] = useState(false)
  const [session, setSession] = useState(null)
  const [error, setError] = useState(null)
  
  const glRef = useRef(null)
  const sessionRef = useRef(null)
  
  // Check WebXR support on mount
  useEffect(() => {
    checkSupport()
    
    return () => {
      // Cleanup session on unmount
      if (sessionRef.current) {
        sessionRef.current.end()
      }
    }
  }, [])
  
  const checkSupport = async () => {
    if (!navigator.xr) {
      setIsSupported(false)
      return
    }
    
    try {
      const vrSupported = await navigator.xr.isSessionSupported('immersive-vr').catch(() => false)
      const arSupported = await navigator.xr.isSessionSupported('immersive-ar').catch(() => false)
      
      setSupportedModes({ vr: vrSupported, ar: arSupported })
      setIsSupported(vrSupported || arSupported)
    } catch (err) {
      console.warn('WebXR support check failed:', err)
      setIsSupported(false)
    }
  }
  
  /**
   * Enter XR session
   */
  const enterXR = useCallback(async (mode = 'immersive-vr', gl = null) => {
    if (!navigator.xr) {
      setError('WebXR not available')
      return null
    }
    
    try {
      setError(null)
      
      // Store gl context reference
      if (gl) {
        glRef.current = gl
      }
      
      const sessionInit = {
        optionalFeatures: [
          'local-floor',
          'bounded-floor',
          'hand-tracking',
          'layers',
        ],
      }
      
      // Add AR-specific features
      if (mode === 'immersive-ar') {
        sessionInit.optionalFeatures.push('hit-test', 'dom-overlay')
        sessionInit.domOverlay = { root: document.body }
      }
      
      const xrSession = await navigator.xr.requestSession(mode, sessionInit)
      
      sessionRef.current = xrSession
      setSession(xrSession)
      setIsPresenting(true)
      
      // Handle session end
      xrSession.addEventListener('end', () => {
        sessionRef.current = null
        setSession(null)
        setIsPresenting(false)
      })
      
      return xrSession
    } catch (err) {
      console.error('Failed to enter XR:', err)
      setError(err.message || 'Failed to enter XR mode')
      return null
    }
  }, [])
  
  /**
   * Exit XR session
   */
  const exitXR = useCallback(async () => {
    if (sessionRef.current) {
      try {
        await sessionRef.current.end()
      } catch (err) {
        console.warn('Error ending XR session:', err)
      }
    }
    sessionRef.current = null
    setSession(null)
    setIsPresenting(false)
  }, [])
  
  /**
   * Toggle XR mode
   */
  const toggleXR = useCallback(async (mode = 'immersive-vr', gl = null) => {
    if (isPresenting) {
      await exitXR()
    } else {
      await enterXR(mode, gl)
    }
  }, [isPresenting, enterXR, exitXR])
  
  return {
    isSupported,
    supportedModes,
    isPresenting,
    session,
    error,
    enterXR,
    exitXR,
    toggleXR,
  }
}

/**
 * Helper to get WebXR button state for R3F XR component
 */
export function getXRButtonState() {
  return {
    onError: (error) => {
      console.error('XR Error:', error)
    },
  }
}

export default useWebXR
