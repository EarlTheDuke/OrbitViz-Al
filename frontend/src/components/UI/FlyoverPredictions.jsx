import { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  MapPin, 
  X, 
  Navigation, 
  Clock, 
  ChevronRight, 
  Satellite,
  Compass,
  Eye,
  Target,
  RefreshCw,
  Star,
  ArrowUp,
  Bell,
  BellOff,
  Check
} from 'lucide-react'
import { useStore } from '../../stores/useStore'
import { 
  getUpcomingPasses, 
  formatDuration, 
  formatRelativeTime, 
  getPassQuality,
  getNextPass
} from '../../services/passService'
import { notificationService } from '../../services/notificationService'

export default function FlyoverPredictions({ isOpen, onClose }) {
  const { 
    filteredSatellites, 
    userLocation, 
    setUserLocation,
    setSelectedSatellite,
    favoriteNoradIds 
  } = useStore()
  
  const [passes, setPasses] = useState([])
  const [loading, setLoading] = useState(false)
  const [locationInput, setLocationInput] = useState({ lat: '', lng: '' })
  const [selectedFilter, setSelectedFilter] = useState('all') // all, favorites, iss
  
  // Get user's location via browser geolocation
  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser')
      return
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const loc = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          altitude: position.coords.altitude || 0
        }
        setUserLocation(loc)
        setLocationInput({ 
          lat: loc.latitude.toFixed(4), 
          lng: loc.longitude.toFixed(4) 
        })
      },
      (error) => {
        console.error('Error getting location:', error)
        alert('Could not get your location. Please enter it manually.')
      }
    )
  }, [setUserLocation])
  
  // Apply manual location
  const applyManualLocation = useCallback(() => {
    const lat = parseFloat(locationInput.lat)
    const lng = parseFloat(locationInput.lng)
    
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      alert('Please enter valid coordinates (Lat: -90 to 90, Lng: -180 to 180)')
      return
    }
    
    setUserLocation({
      latitude: lat,
      longitude: lng,
      altitude: 0
    })
  }, [locationInput, setUserLocation])
  
  // Calculate passes when location or satellites change
  useEffect(() => {
    if (!userLocation || !isOpen) return
    
    setLoading(true)
    
    // Run in a timeout to not block UI
    setTimeout(() => {
      try {
        // Filter satellites based on selection
        let satsToCheck = filteredSatellites
        
        if (selectedFilter === 'favorites' && favoriteNoradIds?.length) {
          satsToCheck = filteredSatellites.filter(s => favoriteNoradIds.includes(s.noradId))
        } else if (selectedFilter === 'iss') {
          satsToCheck = filteredSatellites.filter(s => 
            s.name.includes('ISS') || s.name.includes('ZARYA') || s.noradId === 25544
          )
        } else if (selectedFilter === 'stations') {
          satsToCheck = filteredSatellites.filter(s => s.type === 'station')
        } else {
          // Limit to important satellites for "all" to avoid long calculation
          satsToCheck = filteredSatellites.filter(s => 
            s.type === 'station' || 
            s.name.includes('STARLINK') ||
            s.name.includes('IRIDIUM') ||
            s.name.includes('GPS') ||
            s.name.includes('ISS')
          ).slice(0, 500)
        }
        
        const upcomingPasses = getUpcomingPasses(satsToCheck, userLocation, 30)
        setPasses(upcomingPasses)
      } catch (error) {
        console.error('Error calculating passes:', error)
      } finally {
        setLoading(false)
      }
    }, 100)
  }, [userLocation, filteredSatellites, selectedFilter, favoriteNoradIds, isOpen])
  
  // Handle selecting a pass
  const handleSelectPass = (pass) => {
    setSelectedSatellite(pass.satellite)
    onClose()
  }
  
  if (!isOpen) return null
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-space-900 border border-space-700 rounded-xl w-full max-w-2xl max-h-[80vh] 
          overflow-hidden shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-space-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyber-blue/20 rounded-lg">
              <Satellite className="w-5 h-5 text-cyber-blue" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Flyover Predictions</h2>
              <p className="text-sm text-space-400">See when satellites pass over your location</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-space-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-space-400" />
          </button>
        </div>
        
        {/* Location Input */}
        <div className="px-6 py-4 border-b border-space-700 bg-space-800/50">
          <div className="flex items-center gap-4">
            <MapPin className="w-5 h-5 text-cyber-green" />
            <span className="text-sm text-space-300">Your Location:</span>
            
            {userLocation ? (
              <div className="flex items-center gap-2">
                <span className="font-mono text-cyber-green">
                  {userLocation.latitude.toFixed(4)}°, {userLocation.longitude.toFixed(4)}°
                </span>
                <button
                  onClick={requestLocation}
                  className="p-1 hover:bg-space-700 rounded"
                  title="Update location"
                >
                  <RefreshCw className="w-4 h-4 text-space-400" />
                </button>
              </div>
            ) : (
              <button
                onClick={requestLocation}
                className="px-3 py-1.5 bg-cyber-blue text-white text-sm rounded-lg 
                  hover:bg-cyber-blue/80 transition-colors flex items-center gap-2"
              >
                <Navigation className="w-4 h-4" />
                Get My Location
              </button>
            )}
          </div>
          
          {/* Manual input */}
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs text-space-500">Or enter manually:</span>
            <input
              type="text"
              placeholder="Lat"
              value={locationInput.lat}
              onChange={(e) => setLocationInput(prev => ({ ...prev, lat: e.target.value }))}
              className="w-24 px-2 py-1 text-sm bg-space-800 border border-space-600 rounded 
                focus:outline-none focus:border-cyber-blue text-space-300"
            />
            <input
              type="text"
              placeholder="Lng"
              value={locationInput.lng}
              onChange={(e) => setLocationInput(prev => ({ ...prev, lng: e.target.value }))}
              className="w-24 px-2 py-1 text-sm bg-space-800 border border-space-600 rounded 
                focus:outline-none focus:border-cyber-blue text-space-300"
            />
            <button
              onClick={applyManualLocation}
              className="px-2 py-1 text-xs bg-space-700 hover:bg-space-600 rounded 
                text-space-300 transition-colors"
            >
              Apply
            </button>
          </div>
        </div>
        
        {/* Filter Tabs */}
        <div className="px-6 py-2 border-b border-space-700 flex gap-2">
          {[
            { id: 'all', label: 'Popular', icon: Star },
            { id: 'stations', label: 'Space Stations', icon: Target },
            { id: 'iss', label: 'ISS Only', icon: Satellite },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setSelectedFilter(id)}
              className={`px-3 py-1.5 text-xs rounded-lg flex items-center gap-2 transition-colors ${
                selectedFilter === id
                  ? 'bg-cyber-blue/20 text-cyber-blue border border-cyber-blue/50'
                  : 'bg-space-800 text-space-400 hover:bg-space-700 border border-transparent'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
        
        {/* Passes List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {!userLocation ? (
            <div className="flex flex-col items-center justify-center h-64 text-space-500">
              <MapPin className="w-12 h-12 mb-4 opacity-50" />
              <p>Set your location to see flyover predictions</p>
            </div>
          ) : loading ? (
            <div className="flex flex-col items-center justify-center h-64 text-space-500">
              <RefreshCw className="w-8 h-8 mb-4 animate-spin" />
              <p>Calculating passes...</p>
            </div>
          ) : passes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-space-500">
              <Eye className="w-12 h-12 mb-4 opacity-50" />
              <p>No visible passes in the next 24 hours</p>
              <p className="text-xs mt-2">Try selecting a different filter</p>
            </div>
          ) : (
            <div className="divide-y divide-space-800">
              {passes.map((pass, index) => (
                <PassItem 
                  key={`${pass.satellite.noradId}-${index}`} 
                  pass={pass} 
                  onSelect={() => handleSelectPass(pass)}
                />
              ))}
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="px-6 py-3 border-t border-space-700 bg-space-800/50">
          <p className="text-xs text-space-500">
            Passes shown for elevations above 10°. Times are approximate.
          </p>
        </div>
      </motion.div>
    </motion.div>
  )
}

// Individual pass item component
function PassItem({ pass, onSelect }) {
  const [reminderSet, setReminderSet] = useState(false)
  const quality = getPassQuality(pass.maxElevation)
  const qualityColors = {
    excellent: 'text-cyber-green bg-cyber-green/20 border-cyber-green/50',
    good: 'text-cyber-blue bg-cyber-blue/20 border-cyber-blue/50',
    fair: 'text-yellow-400 bg-yellow-400/20 border-yellow-400/50',
    poor: 'text-space-400 bg-space-700/50 border-space-600',
  }
  
  const isNow = pass.startTime <= new Date() && pass.endTime >= new Date()
  const isFuture = pass.startTime > new Date()
  
  const handleSetReminder = (e) => {
    e.stopPropagation()
    
    // Create pass object format expected by notification service
    const passData = {
      start: pass.startTime.toISOString(),
      end: pass.endTime.toISOString(),
      max_elevation: pass.maxElevation,
    }
    
    notificationService.notifyFlyover(pass.satellite, passData, 5) // 5 min reminder
    setReminderSet(true)
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full px-6 py-4 hover:bg-space-800/50 transition-colors text-left group"
    >
      <div className="flex items-start justify-between">
        <button onClick={onSelect} className="flex-1 text-left">
          {/* Satellite Name */}
          <div className="flex items-center gap-2">
            <span className="font-medium text-white group-hover:text-cyber-blue transition-colors">
              {pass.satellite.name}
            </span>
            {isNow && (
              <span className="px-2 py-0.5 text-[10px] bg-cyber-green/20 text-cyber-green 
                rounded-full animate-pulse">
                VISIBLE NOW
              </span>
            )}
          </div>
          
          {/* Time */}
          <div className="flex items-center gap-4 mt-1 text-sm">
            <div className="flex items-center gap-1.5 text-space-400">
              <Clock className="w-3.5 h-3.5" />
              <span>{formatRelativeTime(pass.startTime)}</span>
            </div>
            <span className="text-space-600">•</span>
            <span className="text-space-400">
              {pass.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            <span className="text-space-600">→</span>
            <span className="text-space-400">
              {pass.endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          
          {/* Pass Details */}
          <div className="flex items-center gap-4 mt-2 text-xs">
            <div className="flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-space-500" />
              <span className="text-space-400">
                {pass.startDirection} → {pass.endDirection}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <ArrowUp className="w-3.5 h-3.5 text-space-500" />
              <span className="text-space-400">
                Max {pass.maxElevation.toFixed(0)}°
              </span>
            </div>
            <span className="text-space-500">
              {formatDuration(pass.duration)}
            </span>
          </div>
        </button>
        
        {/* Quality Badge & Reminder Button */}
        <div className="flex items-center gap-2">
          {/* Set Reminder Button */}
          {isFuture && (
            <button
              onClick={handleSetReminder}
              disabled={reminderSet}
              className={`p-1.5 rounded-lg transition-all ${
                reminderSet 
                  ? 'bg-cyber-green/20 text-cyber-green cursor-default' 
                  : 'hover:bg-space-700 text-space-500 hover:text-cyber-blue'
              }`}
              title={reminderSet ? 'Reminder set!' : 'Set reminder (5 min before)'}
            >
              {reminderSet ? <Check className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
            </button>
          )}
          
          <span className={`px-2 py-1 text-xs rounded border capitalize ${qualityColors[quality]}`}>
            {quality}
          </span>
          <button onClick={onSelect}>
            <ChevronRight className="w-4 h-4 text-space-600 group-hover:text-cyber-blue 
              group-hover:translate-x-1 transition-all" />
          </button>
        </div>
      </div>
    </motion.div>
  )
}

// Export button to open flyover predictions
export function FlyoverButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="p-2 rounded-lg bg-space-800/50 text-space-400 hover:bg-space-700 
        hover:text-white transition-all border border-transparent"
      title="Flyover Predictions"
    >
      <MapPin className="w-5 h-5" />
    </button>
  )
}
