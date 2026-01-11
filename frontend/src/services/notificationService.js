/**
 * Browser Push Notification Service for OrbitViz AI
 * Handles notification permissions, scheduling, and delivery
 */

class NotificationService {
  constructor() {
    this.permission = 'default'
    this.notifications = []
    this.maxNotifications = 50 // Keep last 50 notifications
    this.listeners = new Set()
    this.scheduledNotifications = new Map() // For flyover reminders
    this.soundEnabled = true
    
    // Load persisted state
    this.loadState()
    
    // Check permission on init
    if (typeof window !== 'undefined' && 'Notification' in window) {
      this.permission = Notification.permission
    }
  }
  
  /**
   * Request notification permission from user
   */
  async requestPermission() {
    if (!('Notification' in window)) {
      console.warn('Browser does not support notifications')
      return 'denied'
    }
    
    if (Notification.permission === 'granted') {
      this.permission = 'granted'
      return 'granted'
    }
    
    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission()
      this.permission = permission
      this.saveState()
      return permission
    }
    
    return 'denied'
  }
  
  /**
   * Check if notifications are supported and enabled
   */
  isEnabled() {
    return 'Notification' in window && this.permission === 'granted'
  }
  
  /**
   * Send a browser notification
   */
  async send(title, options = {}) {
    const notification = {
      id: Date.now(),
      title,
      body: options.body || '',
      type: options.type || 'info', // info, warning, alert, success
      icon: options.icon || '/satellite.svg',
      timestamp: new Date().toISOString(),
      read: false,
      data: options.data || {},
    }
    
    // Add to history
    this.notifications.unshift(notification)
    if (this.notifications.length > this.maxNotifications) {
      this.notifications = this.notifications.slice(0, this.maxNotifications)
    }
    
    // Play sound if enabled
    if (this.soundEnabled && options.type !== 'info') {
      this.playSound(options.type)
    }
    
    // Save state
    this.saveState()
    
    // Notify listeners
    this.notifyListeners()
    
    // Send browser notification if permission granted
    if (this.isEnabled() && !document.hasFocus()) {
      try {
        const browserNotif = new Notification(title, {
          body: options.body,
          icon: options.icon || '/satellite.svg',
          badge: '/satellite.svg',
          tag: options.tag || notification.id.toString(),
          requireInteraction: options.type === 'alert',
          silent: !this.soundEnabled,
        })
        
        // Handle click
        browserNotif.onclick = () => {
          window.focus()
          if (options.onClick) options.onClick()
          browserNotif.close()
        }
        
        // Auto close after 10 seconds for non-alerts
        if (options.type !== 'alert') {
          setTimeout(() => browserNotif.close(), 10000)
        }
      } catch (err) {
        console.warn('Failed to show notification:', err)
      }
    }
    
    return notification
  }
  
  /**
   * Play notification sound
   */
  playSound(type = 'info') {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      // Different sounds for different types
      const sounds = {
        info: { freq: 440, duration: 0.1 },
        success: { freq: 660, duration: 0.15 },
        warning: { freq: 330, duration: 0.2 },
        alert: { freq: 880, duration: 0.3 },
      }
      
      const sound = sounds[type] || sounds.info
      
      oscillator.frequency.value = sound.freq
      oscillator.type = 'sine'
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + sound.duration)
      
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + sound.duration)
    } catch (err) {
      // Sound not critical, ignore errors
    }
  }
  
  /**
   * Schedule a notification for the future (e.g., satellite pass reminder)
   */
  scheduleNotification(id, title, options, triggerTime) {
    const delay = new Date(triggerTime).getTime() - Date.now()
    
    if (delay <= 0) return null
    
    // Clear existing scheduled notification with same ID
    this.cancelScheduled(id)
    
    const timeoutId = setTimeout(() => {
      this.send(title, options)
      this.scheduledNotifications.delete(id)
      this.saveState()
    }, delay)
    
    this.scheduledNotifications.set(id, {
      timeoutId,
      title,
      options,
      triggerTime,
    })
    
    this.saveState()
    return id
  }
  
  /**
   * Cancel a scheduled notification
   */
  cancelScheduled(id) {
    const scheduled = this.scheduledNotifications.get(id)
    if (scheduled) {
      clearTimeout(scheduled.timeoutId)
      this.scheduledNotifications.delete(id)
      this.saveState()
    }
  }
  
  /**
   * Get all notifications
   */
  getNotifications() {
    return this.notifications
  }
  
  /**
   * Get unread count
   */
  getUnreadCount() {
    return this.notifications.filter(n => !n.read).length
  }
  
  /**
   * Mark notification as read
   */
  markAsRead(id) {
    const notification = this.notifications.find(n => n.id === id)
    if (notification) {
      notification.read = true
      this.saveState()
      this.notifyListeners()
    }
  }
  
  /**
   * Mark all as read
   */
  markAllAsRead() {
    this.notifications.forEach(n => n.read = true)
    this.saveState()
    this.notifyListeners()
  }
  
  /**
   * Clear all notifications
   */
  clearAll() {
    this.notifications = []
    this.saveState()
    this.notifyListeners()
  }
  
  /**
   * Delete a specific notification
   */
  deleteNotification(id) {
    this.notifications = this.notifications.filter(n => n.id !== id)
    this.saveState()
    this.notifyListeners()
  }
  
  /**
   * Toggle sound
   */
  toggleSound(enabled) {
    this.soundEnabled = enabled !== undefined ? enabled : !this.soundEnabled
    this.saveState()
  }
  
  /**
   * Subscribe to notification changes
   */
  subscribe(callback) {
    this.listeners.add(callback)
    return () => this.listeners.delete(callback)
  }
  
  /**
   * Notify all listeners
   */
  notifyListeners() {
    this.listeners.forEach(cb => cb(this.notifications))
  }
  
  /**
   * Save state to localStorage
   */
  saveState() {
    try {
      const state = {
        notifications: this.notifications,
        soundEnabled: this.soundEnabled,
        permission: this.permission,
      }
      localStorage.setItem('orbitviz_notifications', JSON.stringify(state))
    } catch (err) {
      console.warn('Failed to save notification state:', err)
    }
  }
  
  /**
   * Load state from localStorage
   */
  loadState() {
    try {
      const saved = localStorage.getItem('orbitviz_notifications')
      if (saved) {
        const state = JSON.parse(saved)
        this.notifications = state.notifications || []
        this.soundEnabled = state.soundEnabled !== false
      }
    } catch (err) {
      console.warn('Failed to load notification state:', err)
    }
  }
  
  // ============================================
  // Pre-defined notification types for OrbitViz
  // ============================================
  
  /**
   * Satellite flyover/pass notification
   */
  notifyFlyover(satellite, pass, minutesBefore = 5) {
    const passTime = new Date(pass.start)
    const reminderTime = new Date(passTime.getTime() - minutesBefore * 60000)
    
    // Schedule reminder
    this.scheduleNotification(
      `flyover-${satellite.noradId}-${pass.start}`,
      `🛰️ ${satellite.name} Flyover Soon!`,
      {
        body: `${satellite.name} will pass over your location in ${minutesBefore} minutes with max elevation ${pass.max_elevation}°`,
        type: 'info',
        data: { satellite, pass },
      },
      reminderTime
    )
    
    // Immediate notification to confirm scheduling
    return this.send(
      `📅 Pass Reminder Set`,
      {
        body: `You'll be notified ${minutesBefore} min before ${satellite.name} passes at ${passTime.toLocaleTimeString()}`,
        type: 'success',
        data: { satellite, pass },
      }
    )
  }
  
  /**
   * Collision alert notification
   */
  notifyCollision(satellite1, satellite2, distance, time, riskLevel) {
    const typeMap = {
      critical: 'alert',
      high: 'alert',
      moderate: 'warning',
      low: 'info',
    }
    
    return this.send(
      `⚠️ Collision Alert: ${riskLevel.toUpperCase()}`,
      {
        body: `${satellite1} will approach within ${distance.toFixed(2)} km of ${satellite2} at ${new Date(time).toLocaleString()}`,
        type: typeMap[riskLevel] || 'warning',
        tag: `collision-${satellite1}-${satellite2}`,
        data: { satellite1, satellite2, distance, time, riskLevel },
      }
    )
  }
  
  /**
   * Favorite satellite update notification
   */
  notifyFavoriteUpdate(satellite, updateType, details) {
    const titles = {
      position: `📍 ${satellite.name} Position Update`,
      reentry: `🔥 ${satellite.name} Re-entry Prediction`,
      maneuver: `🚀 ${satellite.name} Orbit Maneuver Detected`,
    }
    
    return this.send(
      titles[updateType] || `📡 ${satellite.name} Update`,
      {
        body: details,
        type: 'info',
        data: { satellite, updateType },
      }
    )
  }
  
  /**
   * Backend status notification
   */
  notifyBackendStatus(connected, error = null) {
    if (connected) {
      return this.send(
        '✅ Backend Connected',
        {
          body: 'Real-time satellite updates and AI predictions are now available',
          type: 'success',
        }
      )
    } else {
      return this.send(
        '⚠️ Backend Disconnected',
        {
          body: error || 'AI features temporarily unavailable. Reconnecting...',
          type: 'warning',
        }
      )
    }
  }
  
  /**
   * WebSocket status notification
   */
  notifyWebSocketStatus(connected) {
    if (connected) {
      return this.send(
        '🔗 Real-time Connection Established',
        {
          body: 'Receiving live satellite position updates',
          type: 'success',
        }
      )
    } else {
      return this.send(
        '⚡ Real-time Connection Lost',
        {
          body: 'Falling back to client-side calculations',
          type: 'warning',
        }
      )
    }
  }
}

// Singleton instance
export const notificationService = new NotificationService()

// Export for direct use
export default notificationService
