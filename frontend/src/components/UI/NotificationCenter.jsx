import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Bell, 
  BellOff, 
  X, 
  Check, 
  CheckCheck, 
  Trash2, 
  Volume2, 
  VolumeX,
  AlertTriangle,
  Info,
  CheckCircle,
  AlertCircle,
  Satellite,
  Clock,
  ChevronDown,
} from 'lucide-react'
import { notificationService } from '../../services/notificationService'

/**
 * Notification Center - Bell icon button that opens notification panel
 */
export function NotificationButton({ onClick }) {
  const [unreadCount, setUnreadCount] = useState(0)
  const [permission, setPermission] = useState('default')
  
  useEffect(() => {
    setUnreadCount(notificationService.getUnreadCount())
    setPermission(notificationService.permission)
    
    return notificationService.subscribe(() => {
      setUnreadCount(notificationService.getUnreadCount())
    })
  }, [])
  
  return (
    <button
      onClick={onClick}
      className="relative p-2 hover:bg-space-700 rounded-lg transition-colors text-space-500 hover:text-cyber-blue"
      title="Notifications"
    >
      {permission === 'granted' ? (
        <Bell className="w-4 h-4" />
      ) : (
        <BellOff className="w-4 h-4" />
      )}
      
      {unreadCount > 0 && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-cyber-orange text-[10px] 
            font-bold rounded-full flex items-center justify-center text-space-900"
        >
          {unreadCount > 9 ? '9+' : unreadCount}
        </motion.span>
      )}
    </button>
  )
}

/**
 * Full Notification Panel Modal
 */
export default function NotificationCenter({ isOpen, onClose }) {
  const [notifications, setNotifications] = useState([])
  const [permission, setPermission] = useState(notificationService.permission)
  const [soundEnabled, setSoundEnabled] = useState(notificationService.soundEnabled)
  const [filter, setFilter] = useState('all') // all, unread, alerts
  
  useEffect(() => {
    setNotifications(notificationService.getNotifications())
    
    return notificationService.subscribe((notifs) => {
      setNotifications([...notifs])
    })
  }, [])
  
  const handleRequestPermission = async () => {
    const result = await notificationService.requestPermission()
    setPermission(result)
    
    if (result === 'granted') {
      notificationService.send('🎉 Notifications Enabled', {
        body: 'You will now receive alerts for satellite passes and collision warnings',
        type: 'success',
      })
    }
  }
  
  const handleToggleSound = () => {
    notificationService.toggleSound()
    setSoundEnabled(notificationService.soundEnabled)
  }
  
  const handleMarkAllRead = () => {
    notificationService.markAllAsRead()
  }
  
  const handleClearAll = () => {
    notificationService.clearAll()
  }
  
  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.read
    if (filter === 'alerts') return n.type === 'alert' || n.type === 'warning'
    return true
  })
  
  if (!isOpen) return null
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-start justify-end pt-20 pr-4"
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-space-900/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Panel */}
      <motion.div
        initial={{ x: 100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 100, opacity: 0 }}
        className="relative w-96 max-h-[80vh] glass-panel-strong border border-space-600 
          rounded-xl overflow-hidden shadow-2xl shadow-cyber-blue/10 flex flex-col"
      >
        {/* Header */}
        <div className="p-4 border-b border-space-600 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-cyber-blue" />
            <h2 className="font-display font-semibold">Notifications</h2>
            {notifications.filter(n => !n.read).length > 0 && (
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-cyber-orange/20 text-cyber-orange">
                {notifications.filter(n => !n.read).length} new
              </span>
            )}
          </div>
          
          <button
            onClick={onClose}
            className="p-1 hover:bg-space-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Permission Request */}
        {permission !== 'granted' && (
          <div className="p-4 bg-cyber-blue/10 border-b border-space-600">
            <div className="flex items-start gap-3">
              <BellOff className="w-5 h-5 text-cyber-blue mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium">Enable Notifications</p>
                <p className="text-xs text-space-400 mt-1">
                  Get alerts for satellite passes over your location and collision warnings
                </p>
                <button
                  onClick={handleRequestPermission}
                  className="mt-2 btn-cyber text-xs px-3 py-1"
                >
                  Enable Now
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Controls */}
        <div className="p-3 border-b border-space-600 flex items-center justify-between">
          {/* Filters */}
          <div className="flex gap-1">
            {['all', 'unread', 'alerts'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2 py-1 text-xs rounded-md transition-colors capitalize ${
                  filter === f 
                    ? 'bg-cyber-blue/20 text-cyber-blue' 
                    : 'hover:bg-space-700 text-space-400'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleToggleSound}
              className={`p-1.5 rounded-lg transition-colors ${
                soundEnabled ? 'text-cyber-green' : 'text-space-500'
              } hover:bg-space-700`}
              title={soundEnabled ? 'Mute sounds' : 'Enable sounds'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
            
            <button
              onClick={handleMarkAllRead}
              className="p-1.5 rounded-lg transition-colors text-space-500 hover:text-cyber-blue hover:bg-space-700"
              title="Mark all as read"
            >
              <CheckCheck className="w-4 h-4" />
            </button>
            
            <button
              onClick={handleClearAll}
              className="p-1.5 rounded-lg transition-colors text-space-500 hover:text-cyber-orange hover:bg-space-700"
              title="Clear all"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {/* Notification List */}
        <div className="flex-1 overflow-y-auto">
          {filteredNotifications.length === 0 ? (
            <div className="p-8 text-center">
              <Satellite className="w-12 h-12 mx-auto mb-3 text-space-600" />
              <p className="text-space-400 text-sm">No notifications yet</p>
              <p className="text-space-600 text-xs mt-1">
                You'll see alerts for passes and collisions here
              </p>
            </div>
          ) : (
            <AnimatePresence>
              {filteredNotifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkRead={() => notificationService.markAsRead(notification.id)}
                  onDelete={() => notificationService.deleteNotification(notification.id)}
                />
              ))}
            </AnimatePresence>
          )}
        </div>
        
        {/* Footer */}
        <div className="p-3 border-t border-space-600 text-center">
          <p className="text-[10px] text-space-600 font-mono">
            {permission === 'granted' ? '✓ Notifications enabled' : '⚠ Notifications disabled'}
          </p>
        </div>
      </motion.div>
    </motion.div>
  )
}

/**
 * Individual Notification Item
 */
function NotificationItem({ notification, onMarkRead, onDelete }) {
  const [expanded, setExpanded] = useState(false)
  
  const typeConfig = {
    info: { icon: Info, color: 'text-cyber-blue', bg: 'bg-cyber-blue/10' },
    success: { icon: CheckCircle, color: 'text-cyber-green', bg: 'bg-cyber-green/10' },
    warning: { icon: AlertTriangle, color: 'text-cyber-orange', bg: 'bg-cyber-orange/10' },
    alert: { icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
  }
  
  const config = typeConfig[notification.type] || typeConfig.info
  const Icon = config.icon
  
  const handleClick = () => {
    if (!notification.read) {
      onMarkRead()
    }
    setExpanded(!expanded)
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 100 }}
      className={`border-b border-space-700 transition-colors ${
        notification.read ? 'bg-transparent' : config.bg
      }`}
    >
      <div 
        className="p-3 cursor-pointer hover:bg-space-700/50 transition-colors"
        onClick={handleClick}
      >
        <div className="flex items-start gap-3">
          <div className={`p-1.5 rounded-lg ${config.bg}`}>
            <Icon className={`w-4 h-4 ${config.color}`} />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className={`text-sm font-medium truncate ${
                notification.read ? 'text-space-300' : 'text-white'
              }`}>
                {notification.title}
              </p>
              {!notification.read && (
                <span className="w-2 h-2 rounded-full bg-cyber-blue flex-shrink-0" />
              )}
            </div>
            
            <p className="text-xs text-space-400 mt-0.5 line-clamp-2">
              {notification.body}
            </p>
            
            <div className="flex items-center gap-2 mt-1.5">
              <Clock className="w-3 h-3 text-space-600" />
              <span className="text-[10px] text-space-500 font-mono">
                {formatTimestamp(notification.timestamp)}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            {notification.data && Object.keys(notification.data).length > 0 && (
              <ChevronDown 
                className={`w-4 h-4 text-space-500 transition-transform ${
                  expanded ? 'rotate-180' : ''
                }`}
              />
            )}
            
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
              className="p-1 rounded hover:bg-space-600 text-space-600 hover:text-red-400 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Expanded Details */}
      <AnimatePresence>
        {expanded && notification.data && Object.keys(notification.data).length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-3 pb-3 overflow-hidden"
          >
            <div className="p-2 bg-space-800 rounded-lg text-xs font-mono">
              {notification.data.satellite && (
                <div className="flex justify-between py-1">
                  <span className="text-space-500">Satellite:</span>
                  <span className="text-cyber-blue">{notification.data.satellite.name || notification.data.satellite}</span>
                </div>
              )}
              {notification.data.pass && (
                <>
                  <div className="flex justify-between py-1">
                    <span className="text-space-500">Pass Time:</span>
                    <span>{new Date(notification.data.pass.start).toLocaleTimeString()}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-space-500">Max Elevation:</span>
                    <span className="text-cyber-green">{notification.data.pass.max_elevation}°</span>
                  </div>
                </>
              )}
              {notification.data.distance && (
                <div className="flex justify-between py-1">
                  <span className="text-space-500">Distance:</span>
                  <span className="text-cyber-orange">{notification.data.distance.toFixed(2)} km</span>
                </div>
              )}
              {notification.data.riskLevel && (
                <div className="flex justify-between py-1">
                  <span className="text-space-500">Risk Level:</span>
                  <span className={`uppercase ${
                    notification.data.riskLevel === 'critical' ? 'text-red-400' :
                    notification.data.riskLevel === 'high' ? 'text-orange-400' :
                    notification.data.riskLevel === 'moderate' ? 'text-yellow-400' : 'text-green-400'
                  }`}>
                    {notification.data.riskLevel}
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/**
 * Format timestamp to relative time
 */
function formatTimestamp(timestamp) {
  const now = new Date()
  const date = new Date(timestamp)
  const diff = now - date
  
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  
  return date.toLocaleDateString()
}

/**
 * Toast notification component for in-app alerts
 */
export function NotificationToast() {
  const [toasts, setToasts] = useState([])
  
  useEffect(() => {
    return notificationService.subscribe((notifications) => {
      // Show toast for new notifications
      const latest = notifications[0]
      if (latest && !latest.read && document.hasFocus()) {
        // Only show toast if app is focused (browser notif handles unfocused)
        setToasts(prev => {
          // Avoid duplicates
          if (prev.find(t => t.id === latest.id)) return prev
          return [...prev, latest].slice(-3) // Keep max 3 toasts
        })
        
        // Auto remove after 5 seconds
        setTimeout(() => {
          setToasts(prev => prev.filter(t => t.id !== latest.id))
        }, 5000)
      }
    })
  }, [])
  
  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
    notificationService.markAsRead(id)
  }
  
  return (
    <div className="fixed bottom-4 right-4 z-[200] space-y-2">
      <AnimatePresence>
        {toasts.map((toast) => {
          const typeConfig = {
            info: { border: 'border-cyber-blue/50', icon: Info, color: 'text-cyber-blue' },
            success: { border: 'border-cyber-green/50', icon: CheckCircle, color: 'text-cyber-green' },
            warning: { border: 'border-cyber-orange/50', icon: AlertTriangle, color: 'text-cyber-orange' },
            alert: { border: 'border-red-500/50', icon: AlertCircle, color: 'text-red-400' },
          }
          const config = typeConfig[toast.type] || typeConfig.info
          const Icon = config.icon
          
          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 100, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.9 }}
              className={`w-80 glass-panel border ${config.border} rounded-lg p-3 shadow-lg`}
            >
              <div className="flex items-start gap-3">
                <Icon className={`w-5 h-5 ${config.color} flex-shrink-0 mt-0.5`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{toast.title}</p>
                  <p className="text-xs text-space-400 mt-0.5 line-clamp-2">{toast.body}</p>
                </div>
                <button
                  onClick={() => removeToast(toast.id)}
                  className="p-1 hover:bg-space-700 rounded text-space-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
