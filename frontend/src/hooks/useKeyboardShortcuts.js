import { useEffect, useCallback } from 'react'
import { useStore } from '../stores/useStore'

/**
 * Keyboard shortcuts for OrbitViz AI
 * 
 * Space - Pause/Resume simulation
 * +/= - Increase animation speed
 * -/_ - Decrease animation speed
 * F - Toggle fullscreen
 * O - Toggle orbits
 * L - Toggle labels
 * T - Toggle day/night terminator
 * R - Reset to real-time
 * Escape - Clear selection / Exit fullscreen
 * 1-9 - Speed presets (0.1x to 100x)
 */
export function useKeyboardShortcuts() {
  const {
    togglePaused,
    toggleOrbits,
    toggleLabels,
    toggleTerminator,
    toggleFullscreen,
    toggleRealTime,
    setAnimationSpeed,
    animationSpeed,
    clearSelection,
    isPaused,
  } = useStore()
  
  const handleKeyDown = useCallback((event) => {
    // Don't trigger shortcuts when typing in input fields
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
      return
    }
    
    switch (event.key.toLowerCase()) {
      // Space - Pause/Resume
      case ' ':
        event.preventDefault()
        togglePaused()
        break
        
      // + or = - Increase speed
      case '+':
      case '=':
        event.preventDefault()
        const newSpeedUp = Math.min(animationSpeed * 2, 100)
        setAnimationSpeed(newSpeedUp)
        break
        
      // - or _ - Decrease speed
      case '-':
      case '_':
        event.preventDefault()
        const newSpeedDown = Math.max(animationSpeed / 2, 0.1)
        setAnimationSpeed(newSpeedDown)
        break
        
      // F - Fullscreen
      case 'f':
        if (!event.ctrlKey && !event.metaKey) {
          event.preventDefault()
          toggleFullscreen()
        }
        break
        
      // O - Toggle orbits
      case 'o':
        event.preventDefault()
        toggleOrbits()
        break
        
      // L - Toggle labels
      case 'l':
        event.preventDefault()
        toggleLabels()
        break
        
      // T - Toggle terminator
      case 't':
        event.preventDefault()
        toggleTerminator()
        break
        
      // R - Reset to real-time
      case 'r':
        if (!event.ctrlKey && !event.metaKey) {
          event.preventDefault()
          if (!useStore.getState().isRealTime) {
            toggleRealTime()
          }
        }
        break
        
      // Escape - Clear selection or exit fullscreen
      case 'escape':
        if (document.fullscreenElement) {
          document.exitFullscreen()
        } else {
          clearSelection()
        }
        break
        
      // Number keys for speed presets
      case '1':
        setAnimationSpeed(0.1)
        break
      case '2':
        setAnimationSpeed(0.5)
        break
      case '3':
        setAnimationSpeed(1)
        break
      case '4':
        setAnimationSpeed(2)
        break
      case '5':
        setAnimationSpeed(5)
        break
      case '6':
        setAnimationSpeed(10)
        break
      case '7':
        setAnimationSpeed(25)
        break
      case '8':
        setAnimationSpeed(50)
        break
      case '9':
        setAnimationSpeed(100)
        break
        
      default:
        break
    }
  }, [
    togglePaused,
    toggleOrbits,
    toggleLabels,
    toggleTerminator,
    toggleFullscreen,
    toggleRealTime,
    setAnimationSpeed,
    animationSpeed,
    clearSelection,
  ])
  
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}

export default useKeyboardShortcuts
