import * as satellite from 'satellite.js'
import { EARTH_RADIUS_KM, SCALE_FACTOR } from './satelliteService'

/**
 * Calculate satellite passes over a given location
 */

// Minimum elevation angle for a visible pass (degrees)
const MIN_ELEVATION = 10

// Look ahead time for pass predictions (milliseconds)
const PREDICTION_WINDOW = 24 * 60 * 60 * 1000 // 24 hours

// Time step for pass calculation (milliseconds)
const TIME_STEP = 60 * 1000 // 1 minute

/**
 * Calculate the look angle from an observer to a satellite
 * @param {Object} observerGd - Observer geodetic position {latitude, longitude, altitude}
 * @param {Object} satelliteEci - Satellite ECI position
 * @param {Date} date - Current time
 * @returns {Object} Look angle {azimuth, elevation, range}
 */
export function getLookAngle(observerGd, satelliteEci, date) {
  const gmst = satellite.gstime(date)
  
  // Observer position in radians
  const observerGdRad = {
    latitude: observerGd.latitude * Math.PI / 180,
    longitude: observerGd.longitude * Math.PI / 180,
    height: observerGd.altitude || 0
  }
  
  // Calculate observer's ECF position
  const observerEcf = satellite.geodeticToEcf(observerGdRad)
  
  // Calculate look angles
  const lookAngles = satellite.ecfToLookAngles(observerGdRad, satelliteEci)
  
  return {
    azimuth: lookAngles.azimuth * 180 / Math.PI,
    elevation: lookAngles.elevation * 180 / Math.PI,
    range: lookAngles.rangeSat
  }
}

/**
 * Get cardinal direction from azimuth angle
 * @param {number} azimuth - Azimuth in degrees (0-360)
 * @returns {string} Cardinal direction (N, NE, E, etc.)
 */
export function getCardinalDirection(azimuth) {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 
                      'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']
  const index = Math.round(azimuth / 22.5) % 16
  return directions[index]
}

/**
 * Calculate all visible passes for a satellite over a location
 * @param {Object} sat - Satellite object with satrec
 * @param {Object} observerGd - Observer position {latitude, longitude, altitude?}
 * @param {Date} startTime - Start time for predictions
 * @param {number} duration - Duration in milliseconds
 * @returns {Array} Array of pass objects
 */
export function calculatePasses(sat, observerGd, startTime = new Date(), duration = PREDICTION_WINDOW) {
  const passes = []
  let inPass = false
  let currentPass = null
  
  const endTime = new Date(startTime.getTime() + duration)
  let time = new Date(startTime.getTime())
  
  while (time < endTime) {
    try {
      const positionAndVelocity = satellite.propagate(sat.satrec, time)
      
      if (!positionAndVelocity.position) {
        time = new Date(time.getTime() + TIME_STEP)
        continue
      }
      
      const gmst = satellite.gstime(time)
      const positionEcf = satellite.eciToEcf(positionAndVelocity.position, gmst)
      const lookAngles = getLookAngle(observerGd, positionEcf, time)
      
      if (lookAngles.elevation >= MIN_ELEVATION) {
        if (!inPass) {
          // Start of a new pass
          inPass = true
          currentPass = {
            satellite: sat,
            startTime: new Date(time),
            startAzimuth: lookAngles.azimuth,
            startDirection: getCardinalDirection(lookAngles.azimuth),
            maxElevation: lookAngles.elevation,
            maxElevationTime: new Date(time),
            maxAzimuth: lookAngles.azimuth,
            points: []
          }
        }
        
        // Track max elevation
        if (lookAngles.elevation > currentPass.maxElevation) {
          currentPass.maxElevation = lookAngles.elevation
          currentPass.maxElevationTime = new Date(time)
          currentPass.maxAzimuth = lookAngles.azimuth
        }
        
        // Store pass point
        currentPass.points.push({
          time: new Date(time),
          azimuth: lookAngles.azimuth,
          elevation: lookAngles.elevation,
          range: lookAngles.range
        })
        
      } else if (inPass) {
        // End of pass
        currentPass.endTime = new Date(time)
        currentPass.endAzimuth = lookAngles.azimuth
        currentPass.endDirection = getCardinalDirection(lookAngles.azimuth)
        currentPass.duration = (currentPass.endTime - currentPass.startTime) / 1000 // seconds
        
        // Only include passes with meaningful duration
        if (currentPass.duration >= 60 && currentPass.maxElevation >= MIN_ELEVATION) {
          passes.push(currentPass)
        }
        
        inPass = false
        currentPass = null
      }
      
    } catch (error) {
      // Skip problematic time points
    }
    
    time = new Date(time.getTime() + TIME_STEP)
  }
  
  // Handle pass that extends beyond prediction window
  if (inPass && currentPass) {
    currentPass.endTime = new Date(time)
    currentPass.duration = (currentPass.endTime - currentPass.startTime) / 1000
    if (currentPass.duration >= 60) {
      passes.push(currentPass)
    }
  }
  
  return passes
}

/**
 * Calculate next pass for a single satellite
 * @param {Object} sat - Satellite object
 * @param {Object} observerGd - Observer position
 * @returns {Object|null} Next pass or null
 */
export function getNextPass(sat, observerGd) {
  const passes = calculatePasses(sat, observerGd, new Date(), PREDICTION_WINDOW)
  return passes.length > 0 ? passes[0] : null
}

/**
 * Get upcoming passes for multiple satellites
 * @param {Array} satellites - Array of satellite objects
 * @param {Object} observerGd - Observer position
 * @param {number} limit - Maximum number of passes to return
 * @returns {Array} Sorted array of upcoming passes
 */
export function getUpcomingPasses(satellites, observerGd, limit = 20) {
  const allPasses = []
  
  // Calculate passes for each satellite
  for (const sat of satellites) {
    try {
      const passes = calculatePasses(sat, observerGd, new Date(), PREDICTION_WINDOW)
      allPasses.push(...passes)
    } catch (error) {
      // Skip satellites that cause errors
    }
  }
  
  // Sort by start time
  allPasses.sort((a, b) => a.startTime - b.startTime)
  
  // Return limited results
  return allPasses.slice(0, limit)
}

/**
 * Check if a satellite is currently visible from a location
 * @param {Object} sat - Satellite object
 * @param {Object} observerGd - Observer position
 * @returns {Object|null} Current look angles if visible, null otherwise
 */
export function isCurrentlyVisible(sat, observerGd) {
  try {
    const now = new Date()
    const positionAndVelocity = satellite.propagate(sat.satrec, now)
    
    if (!positionAndVelocity.position) return null
    
    const gmst = satellite.gstime(now)
    const positionEcf = satellite.eciToEcf(positionAndVelocity.position, gmst)
    const lookAngles = getLookAngle(observerGd, positionEcf, now)
    
    if (lookAngles.elevation >= MIN_ELEVATION) {
      return {
        azimuth: lookAngles.azimuth,
        elevation: lookAngles.elevation,
        range: lookAngles.range,
        direction: getCardinalDirection(lookAngles.azimuth)
      }
    }
    
    return null
  } catch (error) {
    return null
  }
}

/**
 * Format duration in human readable format
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration
 */
export function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
}

/**
 * Format pass time relative to now
 * @param {Date} time - Pass time
 * @returns {string} Formatted relative time
 */
export function formatRelativeTime(time) {
  const now = new Date()
  const diff = time - now
  
  if (diff < 0) return 'Now'
  
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(mins / 60)
  
  if (hours >= 1) {
    return `in ${hours}h ${mins % 60}m`
  }
  return `in ${mins}m`
}

/**
 * Get pass quality rating based on max elevation
 * @param {number} maxElevation - Maximum elevation in degrees
 * @returns {string} Quality rating
 */
export function getPassQuality(maxElevation) {
  if (maxElevation >= 70) return 'excellent'
  if (maxElevation >= 45) return 'good'
  if (maxElevation >= 25) return 'fair'
  return 'poor'
}

/**
 * Convert observer lat/lng to Three.js position on Earth surface
 * @param {number} latitude - Latitude in degrees
 * @param {number} longitude - Longitude in degrees
 * @returns {Object} Three.js position {x, y, z}
 */
export function latLngToThreeJs(latitude, longitude) {
  const latRad = latitude * Math.PI / 180
  const lngRad = longitude * Math.PI / 180
  const r = EARTH_RADIUS_KM * SCALE_FACTOR
  
  return {
    x: r * Math.cos(latRad) * Math.sin(lngRad),
    y: r * Math.sin(latRad),
    z: r * Math.cos(latRad) * Math.cos(lngRad)
  }
}
