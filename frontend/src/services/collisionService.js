import { getPositionAtTime, SCALE_FACTOR } from './satelliteService'

// Threshold distances for collision warnings (in km)
export const COLLISION_THRESHOLDS = {
  CRITICAL: 1,      // < 1 km - Critical risk
  HIGH: 5,          // < 5 km - High risk
  MODERATE: 10,     // < 10 km - Moderate risk
  LOW: 25,          // < 25 km - Low risk (conjunction)
}

// Calculate distance between two satellites at a given time
export function calculateDistance(sat1, sat2, time) {
  const pos1 = getPositionAtTime(sat1.satrec, time)
  const pos2 = getPositionAtTime(sat2.satrec, time)
  
  if (!pos1 || !pos2) return null
  
  // Distance in Three.js units, convert back to km
  const dx = (pos1.x - pos2.x) / SCALE_FACTOR
  const dy = (pos1.y - pos2.y) / SCALE_FACTOR
  const dz = (pos1.z - pos2.z) / SCALE_FACTOR
  
  return Math.sqrt(dx * dx + dy * dy + dz * dz)
}

// Find close approaches for a satellite over a time period
export function findCloseApproaches(targetSat, allSatellites, options = {}) {
  const {
    startTime = new Date(),
    hoursAhead = 24,
    threshold = COLLISION_THRESHOLDS.LOW,
    maxResults = 10,
  } = options
  
  const approaches = []
  const endTime = new Date(startTime.getTime() + hoursAhead * 60 * 60 * 1000)
  const stepMinutes = 5 // Check every 5 minutes
  
  // Filter out the target satellite and very distant objects
  const candidates = allSatellites.filter(sat => 
    sat.noradId !== targetSat.noradId &&
    Math.abs((sat.altitude || 0) - (targetSat.altitude || 0)) < 100 // Only check satellites at similar altitudes
  )
  
  // Sample times
  const times = []
  for (let t = startTime.getTime(); t <= endTime.getTime(); t += stepMinutes * 60 * 1000) {
    times.push(new Date(t))
  }
  
  // Check each candidate
  for (const candidate of candidates) {
    let minDistance = Infinity
    let minDistanceTime = null
    
    for (const time of times) {
      const distance = calculateDistance(targetSat, candidate, time)
      
      if (distance !== null && distance < minDistance) {
        minDistance = distance
        minDistanceTime = time
      }
    }
    
    if (minDistance <= threshold) {
      approaches.push({
        satellite1: targetSat,
        satellite2: candidate,
        distance: minDistance,
        time: minDistanceTime,
        risk: getRiskLevel(minDistance),
      })
    }
  }
  
  // Sort by distance and limit results
  approaches.sort((a, b) => a.distance - b.distance)
  return approaches.slice(0, maxResults)
}

// Get risk level based on distance
export function getRiskLevel(distance) {
  if (distance < COLLISION_THRESHOLDS.CRITICAL) return 'critical'
  if (distance < COLLISION_THRESHOLDS.HIGH) return 'high'
  if (distance < COLLISION_THRESHOLDS.MODERATE) return 'moderate'
  if (distance < COLLISION_THRESHOLDS.LOW) return 'low'
  return 'safe'
}

// Get color for risk level
export function getRiskColor(risk) {
  switch (risk) {
    case 'critical': return '#ef4444' // Red
    case 'high': return '#f59e0b' // Orange
    case 'moderate': return '#eab308' // Yellow
    case 'low': return '#22c55e' // Green
    default: return '#6b7280' // Gray
  }
}

// Calculate collision probability (simplified model)
export function calculateCollisionProbability(distance, relativeVelocity = 10) {
  // Simplified probability model based on distance
  // In reality, this would use covariance matrices and more complex math
  
  if (distance < COLLISION_THRESHOLDS.CRITICAL) {
    // Very close - high probability
    return Math.min(0.99, 1 - (distance / COLLISION_THRESHOLDS.CRITICAL) * 0.5)
  }
  
  if (distance < COLLISION_THRESHOLDS.HIGH) {
    // Close - moderate to high probability
    return 0.1 + (COLLISION_THRESHOLDS.HIGH - distance) / COLLISION_THRESHOLDS.HIGH * 0.4
  }
  
  if (distance < COLLISION_THRESHOLDS.MODERATE) {
    // Moderate distance
    return 0.01 + (COLLISION_THRESHOLDS.MODERATE - distance) / COLLISION_THRESHOLDS.MODERATE * 0.09
  }
  
  if (distance < COLLISION_THRESHOLDS.LOW) {
    // Conjunction but low risk
    return 0.001 + (COLLISION_THRESHOLDS.LOW - distance) / COLLISION_THRESHOLDS.LOW * 0.009
  }
  
  return 0.0001 // Negligible
}

// Batch collision check for all satellites (expensive operation)
export function findAllConjunctions(satellites, options = {}) {
  const {
    time = new Date(),
    threshold = COLLISION_THRESHOLDS.LOW,
    maxResults = 50,
  } = options
  
  const conjunctions = []
  const checked = new Set()
  
  for (let i = 0; i < satellites.length; i++) {
    for (let j = i + 1; j < satellites.length; j++) {
      const pairKey = `${satellites[i].noradId}-${satellites[j].noradId}`
      if (checked.has(pairKey)) continue
      checked.add(pairKey)
      
      // Quick altitude filter
      const altDiff = Math.abs((satellites[i].altitude || 0) - (satellites[j].altitude || 0))
      if (altDiff > 50) continue
      
      const distance = calculateDistance(satellites[i], satellites[j], time)
      
      if (distance !== null && distance <= threshold) {
        conjunctions.push({
          satellite1: satellites[i],
          satellite2: satellites[j],
          distance,
          time,
          risk: getRiskLevel(distance),
          probability: calculateCollisionProbability(distance),
        })
      }
    }
  }
  
  conjunctions.sort((a, b) => a.distance - b.distance)
  return conjunctions.slice(0, maxResults)
}

// Format distance for display
export function formatDistance(km) {
  if (km < 1) {
    return `${(km * 1000).toFixed(0)} m`
  }
  if (km < 10) {
    return `${km.toFixed(2)} km`
  }
  return `${km.toFixed(1)} km`
}
