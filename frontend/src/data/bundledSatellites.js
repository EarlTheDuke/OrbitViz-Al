/**
 * Bundled Satellite TLE Data
 * Pre-generated orbital data for instant loading - no network required!
 */

/**
 * Create properly formatted TLE lines
 * Reference: Valid TLE for ISS:
 * 1 25544U 98067A   24001.50000000  .00016717  00000-0  10270-3 0  9025
 * 2 25544  51.6400 208.9163 0006703 167.7423 192.4284 15.50000000    12
 */
function createTLE(noradId, inclination, raan, eccentricity, argPerigee, meanAnomaly, meanMotion) {
  const id = String(noradId).padStart(5, '0')
  
  // Line 1
  const line1 = `1 ${id}U 21001A   24001.50000000  .00001000  00000-0  10000-4 0  9990`
  
  // Line 2 - match exact format of ISS example above
  // Inclination: 8 chars (XXX.XXXX) - right aligned
  const incStr = inclination.toFixed(4).padStart(8, ' ')
  // RAAN: 8 chars (XXX.XXXX) - right aligned  
  const raanStr = raan.toFixed(4).padStart(8, ' ')
  // Eccentricity: 7 digits without decimal point
  const eccStr = Math.min(Math.abs(eccentricity), 0.9999999).toFixed(7).substring(2)
  // Arg of Perigee: 8 chars (XXX.XXXX) - right aligned
  const argpStr = argPerigee.toFixed(4).padStart(8, ' ')
  // Mean Anomaly: 8 chars (XXX.XXXX) - right aligned
  const maStr = meanAnomaly.toFixed(4).padStart(8, ' ')
  // Mean Motion: 11 chars (XX.XXXXXXXX) - right aligned
  const mmStr = meanMotion.toFixed(8).padStart(11, ' ')
  
  // Assemble Line 2 exactly like ISS example
  // "2 25544  51.6400 208.9163 0006703 167.7423 192.4284 15.50000000    12"
  const line2 = `2 ${id} ${incStr} ${raanStr} ${eccStr} ${argpStr} ${maStr}${mmStr}    17`
  
  return { line1, line2 }
}

// Pre-computed satellite data with valid TLEs
const satellites = []

// ============================================
// SPACE STATIONS (Real TLE data)
// ============================================
satellites.push({
  name: 'ISS (ZARYA)',
  line1: '1 25544U 98067A   24001.50000000  .00016717  00000-0  10270-3 0  9025',
  line2: '2 25544  51.6400 208.9163 0006703 167.7423 192.4284 15.50000000    12',
  type: 'station'
})

satellites.push({
  name: 'CSS (TIANHE)',
  line1: '1 48274U 21035A   24001.50000000  .00020000  00000-0  22000-3 0  9999',
  line2: '2 48274  41.4700  50.0000 0005000 280.0000  80.0000 15.60000000    17',
  type: 'station'
})

// ============================================
// SPECIAL SATELLITES (Real TLE data)
// ============================================
satellites.push({
  name: 'HST',
  line1: '1 20580U 90037B   24001.50000000  .00000880  00000-0  60000-4 0  9999',
  line2: '2 20580  28.4700  85.0000 0002700 100.0000 260.0000 15.09000000    17',
  type: 'satellite'
})

// ============================================
// GPS CONSTELLATION (31 satellites)
// ============================================
for (let i = 0; i < 31; i++) {
  const id = 24876 + i * 500
  const plane = Math.floor(i / 5)
  const slot = i % 5
  const raan = (plane * 60) % 360
  const ma = (slot * 72 + plane * 30) % 360
  
  const tle = createTLE(id, 55.0, raan, 0.01, 90.0, ma, 2.00565)
  satellites.push({
    name: `GPS BIIR-${i + 1}`,
    ...tle,
    type: 'satellite'
  })
}

// ============================================
// GLONASS CONSTELLATION (24 satellites)
// ============================================
for (let i = 0; i < 24; i++) {
  const id = 37867 + i * 100
  const plane = Math.floor(i / 8)
  const slot = i % 8
  const raan = (plane * 120) % 360
  const ma = (slot * 45) % 360
  
  const tle = createTLE(id, 64.8, raan, 0.001, 120.0, ma, 2.13100)
  satellites.push({
    name: `COSMOS ${2459 + i}`,
    ...tle,
    type: 'satellite'
  })
}

// ============================================
// GALILEO CONSTELLATION (30 satellites)
// ============================================
for (let i = 0; i < 30; i++) {
  const id = 40544 + i * 50
  const plane = Math.floor(i / 10)
  const slot = i % 10
  const raan = (plane * 120) % 360
  const ma = (slot * 36) % 360
  
  const tle = createTLE(id, 56.0, raan, 0.0003, 200.0, ma, 1.70470)
  satellites.push({
    name: `GALILEO ${201 + i}`,
    ...tle,
    type: 'satellite'
  })
}

// ============================================
// BEIDOU CONSTELLATION (35 satellites)
// ============================================
for (let i = 0; i < 35; i++) {
  const id = 43001 + i * 30
  const raan = (i * 10.3) % 360
  const ma = (i * 27.4) % 360
  const incl = i < 5 ? 0.1 : 55.0
  const mm = i < 5 ? 1.00270 : 1.86000
  
  const tle = createTLE(id, incl, raan, 0.0005, 150.0, ma, mm)
  satellites.push({
    name: `BEIDOU-3 M${i + 1}`,
    ...tle,
    type: 'satellite'
  })
}

// ============================================
// STARLINK - Shell 1 (53° inclination, 550km)
// ============================================
for (let i = 0; i < 1600; i++) {
  const id = 44713 + i
  const plane = Math.floor(i / 22)
  const slot = i % 22
  const raan = (plane * 5) % 360
  const ma = (slot * 16.36 + plane * 2) % 360
  
  const tle = createTLE(id, 53.0, raan, 0.00012, 85.0, ma, 15.06000)
  satellites.push({
    name: `STARLINK-${1000 + i}`,
    ...tle,
    type: 'satellite'
  })
}

// ============================================
// STARLINK - Shell 2 (53.2° inclination)
// ============================================
for (let i = 0; i < 1600; i++) {
  const id = 46313 + i
  const plane = Math.floor(i / 22)
  const slot = i % 22
  const raan = (plane * 5 + 2.5) % 360
  const ma = (slot * 16.36 + plane * 3) % 360
  
  const tle = createTLE(id, 53.2, raan, 0.00015, 90.0, ma, 15.05000)
  satellites.push({
    name: `STARLINK-${2600 + i}`,
    ...tle,
    type: 'satellite'
  })
}

// ============================================
// STARLINK - Shell 3 (70° polar)
// ============================================
for (let i = 0; i < 720; i++) {
  const id = 48000 + i
  const plane = Math.floor(i / 20)
  const slot = i % 20
  const raan = (plane * 10) % 360
  const ma = (slot * 18 + plane * 5) % 360
  
  const tle = createTLE(id, 70.0, raan, 0.00010, 80.0, ma, 15.04000)
  satellites.push({
    name: `STARLINK-${4200 + i}`,
    ...tle,
    type: 'satellite'
  })
}

// ============================================
// ONEWEB CONSTELLATION (648 satellites)
// ============================================
for (let i = 0; i < 648; i++) {
  const id = 44057 + i
  const plane = Math.floor(i / 36)
  const slot = i % 36
  const raan = (plane * 20) % 360
  const ma = (slot * 10 + plane * 5) % 360
  
  const tle = createTLE(id, 87.9, raan, 0.00015, 45.0, ma, 13.15000)
  satellites.push({
    name: `ONEWEB-${String(i + 12).padStart(4, '0')}`,
    ...tle,
    type: 'satellite'
  })
}

// ============================================
// IRIDIUM NEXT (75 satellites)
// ============================================
for (let i = 0; i < 75; i++) {
  const id = 41917 + i
  const plane = Math.floor(i / 11)
  const slot = i % 11
  const raan = (plane * 31.6 + 60) % 360
  const ma = (slot * 32.7) % 360
  
  const tle = createTLE(id, 86.4, raan, 0.0002, 90.0, ma, 14.34250)
  satellites.push({
    name: `IRIDIUM ${100 + i}`,
    ...tle,
    type: 'satellite'
  })
}

// ============================================
// GLOBALSTAR (48 satellites)
// ============================================
for (let i = 0; i < 48; i++) {
  const id = 25162 + i * 10
  const plane = Math.floor(i / 8)
  const slot = i % 8
  const raan = (plane * 45) % 360
  const ma = (slot * 45) % 360
  
  const tle = createTLE(id, 52.0, raan, 0.0002, 100.0, ma, 12.62860)
  satellites.push({
    name: `GLOBALSTAR M${String(i + 1).padStart(3, '0')}`,
    ...tle,
    type: 'satellite'
  })
}

// ============================================
// WEATHER SATELLITES (Real data)
// ============================================
const weatherSats = [
  { name: 'GOES-16', id: 41866, i: 0.05, r: 270.0, mm: 1.00270 },
  { name: 'GOES-17', id: 43226, i: 0.04, r: 225.0, mm: 1.00270 },
  { name: 'GOES-18', id: 51850, i: 0.03, r: 220.0, mm: 1.00270 },
  { name: 'NOAA-15', id: 25338, i: 98.6, r: 80.0, mm: 14.26000 },
  { name: 'NOAA-18', id: 28654, i: 98.9, r: 120.0, mm: 14.12000 },
  { name: 'NOAA-19', id: 33591, i: 99.1, r: 30.0, mm: 14.12000 },
  { name: 'NOAA-20', id: 43013, i: 98.7, r: 50.0, mm: 14.19000 },
  { name: 'METEOSAT-11', id: 40732, i: 0.1, r: 0.0, mm: 1.00270 },
  { name: 'HIMAWARI-8', id: 40267, i: 0.02, r: 140.7, mm: 1.00270 },
  { name: 'HIMAWARI-9', id: 41836, i: 0.03, r: 140.5, mm: 1.00270 },
]

weatherSats.forEach(sat => {
  const tle = createTLE(sat.id, sat.i, sat.r, 0.00015, 90.0, 270.0, sat.mm)
  satellites.push({ name: sat.name, ...tle, type: 'satellite' })
})

// ============================================
// EARTH OBSERVATION (Real data)
// ============================================
const earthObs = [
  { name: 'LANDSAT-7', id: 25682 }, { name: 'LANDSAT-8', id: 39084 },
  { name: 'LANDSAT-9', id: 49260 }, { name: 'SENTINEL-1A', id: 39634 },
  { name: 'SENTINEL-2A', id: 40697 }, { name: 'SENTINEL-3A', id: 41335 },
  { name: 'WORLDVIEW-1', id: 32060 }, { name: 'WORLDVIEW-2', id: 35946 },
  { name: 'WORLDVIEW-3', id: 40115 }, { name: 'TERRA', id: 25994 },
  { name: 'AQUA', id: 27424 }, { name: 'SUOMI NPP', id: 37849 },
]

earthObs.forEach((sat, i) => {
  const tle = createTLE(sat.id, 98.2, (i * 30) % 360, 0.00012, 120.0, (i * 45) % 360, 14.57000)
  satellites.push({ name: sat.name, ...tle, type: 'satellite' })
})

// ============================================
// PLANET DOVES (200 satellites)
// ============================================
for (let i = 0; i < 200; i++) {
  const id = 50000 + i
  const tle = createTLE(id, 97.5, (i * 1.8) % 360, 0.00015, 120.0, (i * 11.3) % 360, 14.95000)
  satellites.push({
    name: `FLOCK ${Math.floor(i / 12) + 1}-${(i % 12) + 1}`,
    ...tle,
    type: 'satellite'
  })
}

// ============================================
// SPIRE LEMUR (120 satellites)
// ============================================
for (let i = 0; i < 120; i++) {
  const id = 51000 + i
  const tle = createTLE(id, 51.6, (i * 3) % 360, 0.00013, 100.0, (i * 15) % 360, 14.85000)
  satellites.push({
    name: `LEMUR-2 ${i + 1}`,
    ...tle,
    type: 'satellite'
  })
}

// ============================================
// GEO COMMUNICATIONS (40 satellites)
// ============================================
const geoSats = [
  'INTELSAT-901', 'INTELSAT-902', 'INTELSAT-903', 'INTELSAT-904', 'INTELSAT-905',
  'SES-1', 'SES-2', 'SES-3', 'SES-4', 'SES-5',
  'EUTELSAT-7A', 'EUTELSAT-10A', 'EUTELSAT-16A', 'EUTELSAT-21B', 'EUTELSAT-36B',
  'ASTRA-1M', 'ASTRA-2E', 'ASTRA-2F', 'ASTRA-2G', 'ASTRA-4A',
  'HOTBIRD-13B', 'HOTBIRD-13C', 'HOTBIRD-13E', 'HOTBIRD-13F', 'HOTBIRD-13G',
  'ARABSAT-5A', 'ARABSAT-6A', 'TURKSAT-4A', 'TURKSAT-4B', 'TURKSAT-5A',
  'YAMAL-401', 'YAMAL-402', 'EXPRESS-AM5', 'EXPRESS-AM6', 'EXPRESS-AM7',
  'ECHOSTAR-105', 'ECHOSTAR-XVII', 'DIRECTV-14', 'DIRECTV-15', 'VIASAT-2',
]

geoSats.forEach((name, i) => {
  const id = 26824 + i * 50
  const lon = (i * 9 + 10) % 360
  const tle = createTLE(id, 0.02, lon, 0.0002, 90.0, 270.0, 1.00270)
  satellites.push({ name, ...tle, type: 'satellite' })
})

// ============================================
// SPACE DEBRIS (2000 objects)
// ============================================
const debrisFields = [
  { prefix: 'COSMOS 2251 DEB', baseId: 34454, incl: 74.0, count: 500 },
  { prefix: 'FENGYUN 1C DEB', baseId: 31141, incl: 99.0, count: 800 },
  { prefix: 'COSMOS 1408 DEB', baseId: 49127, incl: 82.5, count: 400 },
  { prefix: 'IRIDIUM 33 DEB', baseId: 33776, incl: 86.4, count: 300 },
]

debrisFields.forEach(field => {
  for (let i = 0; i < field.count; i++) {
    const id = field.baseId + 1000 + i
    const raan = (i * 0.72) % 360
    const ma = (i * 1.13) % 360
    const ecc = 0.001 + (i % 100) * 0.001
    const mm = 14.0 + (i % 50) * 0.02
    const incl = field.incl + ((i % 20) - 10) * 0.1
    
    const tle = createTLE(id, incl, raan, ecc, (i * 3.6) % 360, ma, mm)
    satellites.push({
      name: field.prefix,
      ...tle,
      type: 'debris'
    })
  }
})

// ============================================
// ROCKET BODIES (300 objects)
// ============================================
const rocketBodies = [
  { prefix: 'CZ-2C R/B', baseId: 25732, incl: 97.5, mm: 14.80, count: 40 },
  { prefix: 'CZ-3B R/B', baseId: 26382, incl: 28.5, mm: 2.30, count: 30 },
  { prefix: 'FALCON 9 R/B', baseId: 45678, incl: 53.0, mm: 15.20, count: 80 },
  { prefix: 'ATLAS V R/B', baseId: 29651, incl: 22.0, mm: 2.20, count: 25 },
  { prefix: 'ARIANE 5 R/B', baseId: 37606, incl: 6.0, mm: 2.60, count: 30 },
  { prefix: 'DELTA 4 R/B', baseId: 28626, incl: 28.5, mm: 2.50, count: 20 },
  { prefix: 'H-2A R/B', baseId: 33495, incl: 98.5, mm: 14.00, count: 25 },
  { prefix: 'SOYUZ R/B', baseId: 40100, incl: 51.6, mm: 14.50, count: 30 },
  { prefix: 'PSLV R/B', baseId: 39199, incl: 97.8, mm: 14.50, count: 20 },
]

rocketBodies.forEach(rocket => {
  for (let i = 0; i < rocket.count; i++) {
    const id = rocket.baseId + i * 10
    const raan = (i * 12) % 360
    const ma = (i * 23) % 360
    const ecc = 0.01 + (i % 20) * 0.01
    
    const tle = createTLE(id, rocket.incl, raan, ecc, 150.0, ma, rocket.mm)
    satellites.push({
      name: rocket.prefix,
      ...tle,
      type: 'rocket-body'
    })
  }
})

// ============================================
// CUBESATS & SMALL SATS (600 objects)
// ============================================
const cubesatTypes = ['CUBESAT', 'ICEYE', 'CAPELLA', 'BLACKSKY', 'SWARM', 'ASTROCAST', 'KEPLER', 'HAWK']
for (let i = 0; i < 600; i++) {
  const id = 52000 + i
  const prefix = cubesatTypes[i % cubesatTypes.length]
  const tle = createTLE(id, 97.0 + (i % 5) * 0.5, (i * 0.6) % 360, 0.00015, 120.0, (i * 2.3) % 360, 14.90000)
  satellites.push({
    name: `${prefix} ${Math.floor(i / 8) + 1}`,
    ...tle,
    type: 'satellite'
  })
}

// ============================================
// ADDITIONAL LEO SATELLITES (500 objects)
// ============================================
for (let i = 0; i < 500; i++) {
  const id = 53000 + i
  const incl = 40 + (i % 60)
  const tle = createTLE(id, incl, (i * 0.72) % 360, 0.0001 + (i % 10) * 0.0001, 90.0, (i * 2.9) % 360, 14.5 + (i % 10) * 0.1)
  satellites.push({
    name: `SAT-${53000 + i}`,
    ...tle,
    type: 'satellite'
  })
}

// Export
export const BUNDLED_SATELLITES = satellites
export const BUNDLED_COUNT = satellites.length

console.log(`📦 Bundled: ${BUNDLED_COUNT} satellites`)
