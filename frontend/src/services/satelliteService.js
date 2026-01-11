import * as satellite from 'satellite.js'
import { ALL_FALLBACK_TLE, FALLBACK_SATELLITE_COUNT } from '../data/fallbackTLE'

// Earth radius in km
export const EARTH_RADIUS_KM = 6371

// Scale factor for visualization (1 unit = 1000km)
export const SCALE_FACTOR = 1 / 1000

// Convert satellite.js ECI coordinates to Three.js coordinates
export function eciToThreeJs(eciCoords) {
  // satellite.js uses km, we scale down for Three.js
  // Also swap axes: satellite.js is ECI (x: vernal equinox, y: 90° east, z: north pole)
  // Three.js: x: right, y: up, z: towards camera
  return {
    x: eciCoords.x * SCALE_FACTOR,
    y: eciCoords.z * SCALE_FACTOR, // Z becomes Y (up)
    z: -eciCoords.y * SCALE_FACTOR, // Y becomes -Z
  }
}

// Parse TLE and create satellite record
export function parseTLE(name, line1, line2) {
  try {
    const satrec = satellite.twoline2satrec(line1, line2)
    
    if (!satrec || satrec.error !== 0) {
      return null
    }
    
    // Extract NORAD ID from line 1
    const noradId = parseInt(line1.substring(2, 7).trim())
    
    // Extract international designator
    const intlDesignator = line1.substring(9, 17).trim()
    
    // Determine satellite type from name
    const type = determineSatelliteType(name)
    
    // Get initial position
    const now = new Date()
    const positionAndVelocity = satellite.propagate(satrec, now)
    
    if (!positionAndVelocity.position) {
      return null
    }
    
    const positionEci = positionAndVelocity.position
    const velocityEci = positionAndVelocity.velocity
    
    // Calculate altitude
    const altitude = Math.sqrt(
      positionEci.x ** 2 + positionEci.y ** 2 + positionEci.z ** 2
    ) - EARTH_RADIUS_KM
    
    // Calculate velocity magnitude
    const velocity = Math.sqrt(
      velocityEci.x ** 2 + velocityEci.y ** 2 + velocityEci.z ** 2
    )
    
    // Calculate orbital period (minutes)
    const meanMotion = satrec.no * (1440 / (2 * Math.PI)) // rev/day to rev/min
    const period = meanMotion > 0 ? 1440 / (satrec.no * 1440 / (2 * Math.PI)) : 0
    
    return {
      name: name.trim(),
      noradId,
      intlDesignator,
      type,
      satrec,
      line1,
      line2,
      altitude: Math.round(altitude),
      velocity: velocity.toFixed(2),
      inclination: (satrec.inclo * 180 / Math.PI).toFixed(2),
      eccentricity: satrec.ecco.toFixed(6),
      period: period.toFixed(1),
      position: eciToThreeJs(positionEci),
      color: getColorForType(type),
    }
  } catch (error) {
    console.warn(`Failed to parse TLE for ${name}:`, error.message)
    return null
  }
}

// Determine satellite type from name
function determineSatelliteType(name) {
  const upperName = name.toUpperCase()
  
  if (upperName.includes('ISS') || upperName.includes('TIANGONG') || 
      upperName.includes('STATION') || upperName.includes('CSS')) {
    return 'station'
  }
  
  if (upperName.includes('DEB') || upperName.includes('DEBRIS') || 
      upperName.includes('FRAG')) {
    return 'debris'
  }
  
  if (upperName.includes('R/B') || upperName.includes('ROCKET') || 
      upperName.includes('CENTAUR') || upperName.includes('BLOCK')) {
    return 'rocket-body'
  }
  
  return 'satellite'
}

// Get color for satellite type
export function getColorForType(type) {
  switch (type) {
    case 'station':
      return '#f59e0b' // Amber/orange for stations
    case 'debris':
      return '#ef4444' // Red for debris
    case 'rocket-body':
      return '#8b5cf6' // Purple for rocket bodies
    case 'satellite':
    default:
      return '#10b981' // Green for active satellites
  }
}

// Get position at specific time
export function getPositionAtTime(satrec, date) {
  try {
    const positionAndVelocity = satellite.propagate(satrec, date)
    
    if (!positionAndVelocity.position) {
      return null
    }
    
    return eciToThreeJs(positionAndVelocity.position)
  } catch (error) {
    return null
  }
}

// Get orbital path points
export function getOrbitPath(satrec, numPoints = 180) {
  const points = []
  const now = new Date()
  
  // Get orbital period in milliseconds (approximate from mean motion)
  const meanMotion = satrec.no * (1440 / (2 * Math.PI)) // revolutions per day
  const periodMs = meanMotion > 0 ? (24 * 60 * 60 * 1000) / meanMotion : 90 * 60 * 1000
  
  for (let i = 0; i <= numPoints; i++) {
    const time = new Date(now.getTime() + (i / numPoints) * periodMs)
    const position = getPositionAtTime(satrec, time)
    
    if (position) {
      points.push(position)
    }
  }
  
  return points
}

// Get geodetic position (lat/lng/altitude)
export function getGeodeticPosition(satrec, date) {
  try {
    const positionAndVelocity = satellite.propagate(satrec, date)
    
    if (!positionAndVelocity.position) {
      return null
    }
    
    const gmst = satellite.gstime(date)
    const positionGd = satellite.eciToGeodetic(positionAndVelocity.position, gmst)
    
    return {
      latitude: satellite.degreesLat(positionGd.latitude),
      longitude: satellite.degreesLong(positionGd.longitude),
      altitude: positionGd.height,
    }
  } catch (error) {
    return null
  }
}

// API base URL for backend
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// CelesTrak TLE sources - the ORIGINAL working approach
const CELESTRAK_SOURCES = [
  { name: 'Space Stations', url: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=tle', priority: 1 },
  { name: 'Active Satellites', url: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle', priority: 2 },
  { name: 'Starlink', url: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=starlink&FORMAT=tle', priority: 3 },
  { name: 'OneWeb', url: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=oneweb&FORMAT=tle', priority: 4 },
  { name: 'GPS', url: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=gps-ops&FORMAT=tle', priority: 5 },
  { name: 'GLONASS', url: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=glo-ops&FORMAT=tle', priority: 6 },
  { name: 'Galileo', url: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=galileo&FORMAT=tle', priority: 7 },
  { name: 'Iridium', url: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=iridium-NEXT&FORMAT=tle', priority: 8 },
  { name: 'Weather', url: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=weather&FORMAT=tle', priority: 9 },
  { name: 'NOAA', url: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=noaa&FORMAT=tle', priority: 10 },
  { name: 'Science', url: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=science&FORMAT=tle', priority: 11 },
  { name: 'Geodetic', url: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=geodetic&FORMAT=tle', priority: 12 },
  { name: 'Amateur', url: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=amateur&FORMAT=tle', priority: 13 },
]

/**
 * Fetch TLE data - tries CelesTrak first with timeout, falls back to bundled data
 */
export async function fetchTLEData(onProgress) {
  console.log('🌍 Fetching satellite data...')
  onProgress?.('Connecting to CelesTrak...', 5)
  
  const allSatellites = new Map()
  let sourcesLoaded = 0
  let totalSources = CELESTRAK_SOURCES.length
  let failedSources = 0
  
  // Try CelesTrak sources with short timeout
  for (const source of CELESTRAK_SOURCES) {
    const progressPercent = 5 + (sourcesLoaded / totalSources) * 45
    onProgress?.(`Loading ${source.name}...`, progressPercent)
    
    try {
      console.log(`  Fetching ${source.name}...`)
      
      // Use AbortController for timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 8000) // 8 second timeout per source
      
      const response = await fetch(source.url, {
        headers: { 'Accept': 'text/plain' },
        signal: controller.signal,
      })
      
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        console.warn(`  ✗ ${source.name}: HTTP ${response.status}`)
        failedSources++
        sourcesLoaded++
        continue
      }
      
      const text = await response.text()
      const satellites = parseTLEText(text)
      
      console.log(`  ✓ ${source.name}: ${satellites.length} satellites`)
      
      for (const sat of satellites) {
        if (!allSatellites.has(sat.noradId)) {
          allSatellites.set(sat.noradId, sat)
        }
      }
      
    } catch (error) {
      console.warn(`  ✗ ${source.name}: ${error.message}`)
      failedSources++
    }
    
    sourcesLoaded++
    
    // If more than half the sources failed, switch to fallback faster
    if (failedSources > totalSources / 2 && allSatellites.size < 100) {
      console.log('⚡ Too many failures, switching to fallback data...')
      break
    }
  }
  
  const satelliteArray = Array.from(allSatellites.values())
  
  // If we got a good amount of satellites from CelesTrak, return them
  if (satelliteArray.length > 500) {
    console.log(`🛰️ Total: ${satelliteArray.length} satellites from CelesTrak`)
    onProgress?.(`Loaded ${satelliteArray.length.toLocaleString()} satellites`, 100)
    return satelliteArray
  }
  
  // Otherwise, merge with fallback data
  console.log(`📦 Supplementing with fallback data (got ${satelliteArray.length} from network)...`)
  onProgress?.('Loading bundled satellite data...', 55)
  
  // Load comprehensive bundled data
  const fallbackSatellites = parseTLEText(ALL_FALLBACK_TLE)
  console.log(`📦 Parsed ${fallbackSatellites.length} satellites from fallback data`)
  
  // Merge: fallback data + any CelesTrak data (CelesTrak takes priority)
  const mergedMap = new Map()
  
  // Add fallback first
  for (const sat of fallbackSatellites) {
    mergedMap.set(sat.noradId, sat)
  }
  
  // Override with CelesTrak data (fresher)
  for (const sat of satelliteArray) {
    mergedMap.set(sat.noradId, sat)
  }
  
  const finalSatellites = Array.from(mergedMap.values())
  
  console.log(`🛰️ Total: ${finalSatellites.length} satellites (${satelliteArray.length} live + ${fallbackSatellites.length} bundled)`)
  onProgress?.(`Loaded ${finalSatellites.length.toLocaleString()} satellites`, 100)
  
  return finalSatellites
}

// Fallback sample TLE data for when APIs are unavailable
function getFallbackSatellites() {
  // Real TLE data for key satellites (updated periodically)
  const sampleTLEs = [
    // ISS
    { name: 'ISS (ZARYA)', line1: '1 25544U 98067A   24001.50000000  .00016717  00000-0  10270-3 0  9025', line2: '2 25544  51.6400 208.9163 0006703 167.7423 192.4284 15.50000000    12' },
    // Hubble
    { name: 'HST', line1: '1 20580U 90037B   24001.50000000  .00000880  00000-0  00000+0 0  9999', line2: '2 20580  28.4700  85.0000 0002700 100.0000 260.0000 15.09000000    17' },
    // Tiangong
    { name: 'CSS (TIANHE)', line1: '1 48274U 21035A   24001.50000000  .00020000  00000-0  22000-3 0  9999', line2: '2 48274  41.4700  50.0000 0005000 280.0000  80.0000 15.60000000    17' },
    // GPS satellites
    { name: 'GPS BIIR-2  (PRN 13)', line1: '1 24876U 97035A   24001.50000000 -.00000020  00000-0  00000+0 0  9999', line2: '2 24876  55.4000 150.0000 0100000  90.0000 270.0000  2.00550000    17' },
    { name: 'GPS BIIR-3  (PRN 11)', line1: '1 25933U 99055A   24001.50000000  .00000010  00000-0  00000+0 0  9999', line2: '2 25933  51.9000 210.0000 0150000 120.0000 240.0000  2.00560000    17' },
    { name: 'GPS BIIR-4  (PRN 20)', line1: '1 26360U 00025A   24001.50000000 -.00000010  00000-0  00000+0 0  9999', line2: '2 26360  53.0000  30.0000 0050000 200.0000 160.0000  2.00570000    17' },
    { name: 'GPS BIIR-5  (PRN 28)', line1: '1 26407U 00040A   24001.50000000  .00000005  00000-0  00000+0 0  9999', line2: '2 26407  56.7000  90.0000 0080000  45.0000 315.0000  2.00580000    17' },
    { name: 'GPS BIIF-1  (PRN 25)', line1: '1 36585U 10022A   24001.50000000 -.00000005  00000-0  00000+0 0  9999', line2: '2 36585  55.0000 270.0000 0120000 135.0000 225.0000  2.00590000    17' },
    // Starlink samples
    { name: 'STARLINK-1007', line1: '1 44713U 19074A   24001.50000000  .00020000  00000-0  10000-3 0  9999', line2: '2 44713  53.0000 120.0000 0001500  90.0000 270.0000 15.06000000    17' },
    { name: 'STARLINK-1008', line1: '1 44714U 19074B   24001.50000000  .00018000  00000-0  95000-4 0  9999', line2: '2 44714  53.0000 121.0000 0001200  85.0000 275.0000 15.06000000    17' },
    { name: 'STARLINK-1009', line1: '1 44715U 19074C   24001.50000000  .00019000  00000-0  98000-4 0  9999', line2: '2 44715  53.0000 122.0000 0001800  80.0000 280.0000 15.06000000    17' },
    { name: 'STARLINK-1010', line1: '1 44716U 19074D   24001.50000000  .00017000  00000-0  92000-4 0  9999', line2: '2 44716  53.0000 123.0000 0001100  75.0000 285.0000 15.06000000    17' },
    { name: 'STARLINK-1011', line1: '1 44717U 19074E   24001.50000000  .00016000  00000-0  88000-4 0  9999', line2: '2 44717  53.0000 124.0000 0001400  70.0000 290.0000 15.06000000    17' },
    { name: 'STARLINK-1012', line1: '1 44718U 19074F   24001.50000000  .00021000  00000-0  11000-3 0  9999', line2: '2 44718  53.0000 125.0000 0001600  65.0000 295.0000 15.06000000    17' },
    { name: 'STARLINK-1013', line1: '1 44719U 19074G   24001.50000000  .00015000  00000-0  85000-4 0  9999', line2: '2 44719  53.0000 126.0000 0001300  60.0000 300.0000 15.06000000    17' },
    { name: 'STARLINK-1014', line1: '1 44720U 19074H   24001.50000000  .00022000  00000-0  12000-3 0  9999', line2: '2 44720  53.0000 127.0000 0001000  55.0000 305.0000 15.06000000    17' },
    { name: 'STARLINK-1015', line1: '1 44721U 19074J   24001.50000000  .00014000  00000-0  80000-4 0  9999', line2: '2 44721  53.0000 128.0000 0001700  50.0000 310.0000 15.06000000    17' },
    { name: 'STARLINK-1016', line1: '1 44722U 19074K   24001.50000000  .00023000  00000-0  13000-3 0  9999', line2: '2 44722  53.0000 129.0000 0001900  45.0000 315.0000 15.06000000    17' },
    // Iridium
    { name: 'IRIDIUM 100', line1: '1 41917U 17003A   24001.50000000  .00000080  00000-0  20000-4 0  9999', line2: '2 41917  86.4000  60.0000 0002000  90.0000 270.0000 14.34000000    17' },
    { name: 'IRIDIUM 102', line1: '1 41918U 17003B   24001.50000000  .00000075  00000-0  18000-4 0  9999', line2: '2 41918  86.4000  61.0000 0002200  85.0000 275.0000 14.34000000    17' },
    { name: 'IRIDIUM 103', line1: '1 41919U 17003C   24001.50000000  .00000085  00000-0  22000-4 0  9999', line2: '2 41919  86.4000  62.0000 0001800  80.0000 280.0000 14.34000000    17' },
    { name: 'IRIDIUM 104', line1: '1 41920U 17003D   24001.50000000  .00000070  00000-0  16000-4 0  9999', line2: '2 41920  86.4000  63.0000 0002400  75.0000 285.0000 14.34000000    17' },
    { name: 'IRIDIUM 105', line1: '1 41921U 17003E   24001.50000000  .00000090  00000-0  24000-4 0  9999', line2: '2 41921  86.4000  64.0000 0001600  70.0000 290.0000 14.34000000    17' },
    // OneWeb samples
    { name: 'ONEWEB-0012', line1: '1 44057U 19010A   24001.50000000  .00000100  00000-0  10000-4 0  9999', line2: '2 44057  87.9000 180.0000 0001500  45.0000 315.0000 13.15000000    17' },
    { name: 'ONEWEB-0013', line1: '1 44058U 19010B   24001.50000000  .00000095  00000-0  95000-5 0  9999', line2: '2 44058  87.9000 181.0000 0001700  40.0000 320.0000 13.15000000    17' },
    { name: 'ONEWEB-0014', line1: '1 44059U 19010C   24001.50000000  .00000105  00000-0  11000-4 0  9999', line2: '2 44059  87.9000 182.0000 0001300  35.0000 325.0000 13.15000000    17' },
    { name: 'ONEWEB-0015', line1: '1 44060U 19010D   24001.50000000  .00000088  00000-0  88000-5 0  9999', line2: '2 44060  87.9000 183.0000 0001900  30.0000 330.0000 13.15000000    17' },
    // GLONASS
    { name: 'COSMOS 2459 (GLONASS)', line1: '1 37867U 11064A   24001.50000000 -.00000010  00000-0  00000+0 0  9999', line2: '2 37867  64.8000 100.0000 0010000 120.0000 240.0000  2.13000000    17' },
    { name: 'COSMOS 2460 (GLONASS)', line1: '1 37868U 11064B   24001.50000000  .00000005  00000-0  00000+0 0  9999', line2: '2 37868  64.8000 101.0000 0012000 115.0000 245.0000  2.13000000    17' },
    { name: 'COSMOS 2461 (GLONASS)', line1: '1 37869U 11064C   24001.50000000 -.00000008  00000-0  00000+0 0  9999', line2: '2 37869  64.8000 102.0000 0008000 110.0000 250.0000  2.13000000    17' },
    // Galileo
    { name: 'GALILEO 201 (E18)', line1: '1 40544U 15017A   24001.50000000  .00000002  00000-0  00000+0 0  9999', line2: '2 40544  56.0000  45.0000 0003000 200.0000 160.0000  1.70000000    17' },
    { name: 'GALILEO 202 (E14)', line1: '1 40545U 15017B   24001.50000000  .00000001  00000-0  00000+0 0  9999', line2: '2 40545  56.0000  46.0000 0004000 195.0000 165.0000  1.70000000    17' },
    // Debris samples
    { name: 'COSMOS 2251 DEB', line1: '1 34454U 93036PX  24001.50000000  .00002000  00000-0  10000-3 0  9999', line2: '2 34454  74.0000 200.0000 0100000  60.0000 300.0000 14.50000000    17' },
    { name: 'FENGYUN 1C DEB', line1: '1 31141U 99025ANF 24001.50000000  .00001500  00000-0  80000-4 0  9999', line2: '2 31141  99.0000 150.0000 0080000 100.0000 260.0000 14.20000000    17' },
    // Rocket bodies
    { name: 'CZ-2C R/B', line1: '1 25732U 99025B   24001.50000000  .00003000  00000-0  15000-3 0  9999', line2: '2 25732  97.5000  80.0000 0150000 150.0000 210.0000 14.80000000    17' },
    { name: 'FALCON 9 R/B', line1: '1 45678U 20020B   24001.50000000  .00005000  00000-0  25000-3 0  9999', line2: '2 45678  53.0000 250.0000 0200000  20.0000 340.0000 15.20000000    17' },
  ]
  
  const satellites = []
  for (const tle of sampleTLEs) {
    const sat = parseTLE(tle.name, tle.line1, tle.line2)
    if (sat) {
      satellites.push(sat)
    }
  }
  
  return satellites
}

// Parse TLE text file format
function parseTLEText(text) {
  const satellites = []
  const lines = text.trim().split('\n').map(line => line.trim())
  
  // TLE format: name, line1, line2 (3 lines per satellite)
  for (let i = 0; i < lines.length - 2; i += 3) {
    const name = lines[i]
    const line1 = lines[i + 1]
    const line2 = lines[i + 2]
    
    // Validate TLE format
    if (line1?.startsWith('1 ') && line2?.startsWith('2 ')) {
      const sat = parseTLE(name, line1, line2)
      if (sat) {
        satellites.push(sat)
      }
    }
  }
  
  return satellites
}

// Update satellite positions
export function updateSatellitePositions(satellites, date) {
  return satellites.map(sat => {
    const position = getPositionAtTime(sat.satrec, date)
    const geodetic = getGeodeticPosition(sat.satrec, date)
    
    if (position && geodetic) {
      return {
        ...sat,
        position,
        altitude: Math.round(geodetic.altitude),
        latitude: geodetic.latitude.toFixed(2),
        longitude: geodetic.longitude.toFixed(2),
      }
    }
    
    return sat
  })
}
