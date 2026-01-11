import { useRef, useMemo, useEffect, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../../stores/useStore'
import { getPositionAtTime, SCALE_FACTOR, EARTH_RADIUS_KM } from '../../services/satelliteService'

// Helper to get position from WebSocket or client-side calculation
function getPosition(satellite, time, wsPositions, wsConnected, useServerPositions) {
  if (wsConnected && useServerPositions && wsPositions[satellite.noradId]) {
    return wsPositions[satellite.noradId]
  }
  return getPositionAtTime(satellite.satrec, time)
}

// Materials for realistic satellite appearance
const MATERIALS = {
  // Gold Multi-Layer Insulation (MLI) - common on satellites
  goldFoil: new THREE.MeshStandardMaterial({
    color: '#d4a017',
    metalness: 0.9,
    roughness: 0.3,
    envMapIntensity: 1.5,
  }),
  
  // Solar panel cells - dark blue with metallic sheen
  solarCell: new THREE.MeshStandardMaterial({
    color: '#1a237e',
    metalness: 0.4,
    roughness: 0.2,
    emissive: '#0d47a1',
    emissiveIntensity: 0.1,
  }),
  
  // Solar panel backing
  solarBacking: new THREE.MeshStandardMaterial({
    color: '#263238',
    metalness: 0.6,
    roughness: 0.4,
  }),
  
  // White thermal coating
  whiteThermal: new THREE.MeshStandardMaterial({
    color: '#f5f5f5',
    metalness: 0.2,
    roughness: 0.6,
  }),
  
  // Antenna/metallic silver
  antenna: new THREE.MeshStandardMaterial({
    color: '#c0c0c0',
    metalness: 0.95,
    roughness: 0.1,
  }),
  
  // Black thermal blanket
  blackThermal: new THREE.MeshStandardMaterial({
    color: '#212121',
    metalness: 0.1,
    roughness: 0.8,
  }),
  
  // Starlink reflective surface
  starlinkPanel: new THREE.MeshStandardMaterial({
    color: '#e0e0e0',
    metalness: 0.95,
    roughness: 0.05,
  }),
}

// Sun direction calculation for solar panel tracking
function getSunDirection(date) {
  const dayOfYear = Math.floor((date - new Date(date.getFullYear(), 0, 0)) / 86400000)
  const obliquity = 23.45 * Math.PI / 180
  const lambda = (280.46 + 0.98564736 * dayOfYear) * Math.PI / 180
  
  const gmst = (date.getUTCHours() * 3600 + date.getUTCMinutes() * 60 + date.getUTCSeconds()) 
    * (15 / 3600) * Math.PI / 180
  
  return new THREE.Vector3(
    Math.cos(obliquity) * Math.sin(lambda + gmst),
    Math.sin(obliquity) * Math.sin(lambda),
    Math.cos(lambda + gmst)
  ).normalize()
}

/**
 * 3D Satellite Models with Level of Detail
 */
export default function SatelliteModels() {
  const { 
    filteredSatellites, 
    selectedSatellite, 
    simulationTime,
    wsConnected,
    wsPositions,
    useServerPositions,
  } = useStore()
  const { camera } = useThree()
  const [visibleSatellites, setVisibleSatellites] = useState([])
  
  // Find special satellites that should have 3D models
  const specialSatellites = useMemo(() => {
    return filteredSatellites.filter(sat => {
      const name = sat.name.toUpperCase()
      return (
        // Space stations
        (name.includes('ISS') && name.includes('ZARYA')) ||
        sat.noradId === 25544 ||
        name.includes('CSS') && name.includes('TIANHE') ||
        name.includes('TIANGONG') ||
        // Hubble
        name.includes('HUBBLE') ||
        // GPS
        (name.includes('GPS') || name.includes('NAVSTAR')) ||
        // Starlink (limit to first 50 for performance)
        name.includes('STARLINK') ||
        // Iridium
        name.includes('IRIDIUM')
      )
    })
  }, [filteredSatellites])
  
  // LOD: Only show detailed models for satellites within camera range
  useFrame(() => {
    const cameraPos = camera.position.clone()
    const visible = []
    const time = simulationTime || new Date()
    
    for (const sat of specialSatellites) {
      const pos = getPosition(sat, time, wsPositions, wsConnected, useServerPositions)
      if (!pos) continue
      
      const satPos = new THREE.Vector3(pos.x, pos.y, pos.z)
      const distance = cameraPos.distanceTo(satPos)
      
      // Only render detailed model if camera is close enough
      // Different thresholds for different satellite types
      const name = sat.name.toUpperCase()
      let threshold = 15 // Default threshold
      
      if (name.includes('ISS') || name.includes('CSS') || name.includes('HUBBLE')) {
        threshold = 25 // Show space stations from farther
      } else if (name.includes('STARLINK')) {
        threshold = 8 // Starlink only when very close
      }
      
      if (distance < threshold) {
        visible.push({
          ...sat,
          distance,
          modelType: getModelType(sat)
        })
      }
    }
    
    // Limit to 30 models for performance
    visible.sort((a, b) => a.distance - b.distance)
    setVisibleSatellites(visible.slice(0, 30))
  })
  
  return (
    <group>
      {visibleSatellites.map(sat => (
        <SatelliteModel 
          key={sat.noradId} 
          satellite={sat} 
          modelType={sat.modelType}
          time={simulationTime}
          isSelected={selectedSatellite?.noradId === sat.noradId}
          wsPositions={wsPositions}
          wsConnected={wsConnected}
          useServerPositions={useServerPositions}
        />
      ))}
    </group>
  )
}

// Determine model type from satellite name
function getModelType(sat) {
  const name = sat.name.toUpperCase()
  if (name.includes('ISS') || sat.noradId === 25544) return 'iss'
  if (name.includes('HUBBLE')) return 'hubble'
  if (name.includes('CSS') || name.includes('TIANHE') || name.includes('TIANGONG')) return 'css'
  if (name.includes('GPS') || name.includes('NAVSTAR')) return 'gps'
  if (name.includes('STARLINK')) return 'starlink'
  if (name.includes('IRIDIUM')) return 'iridium'
  return 'generic'
}

/**
 * Individual satellite model renderer
 */
function SatelliteModel({ satellite, modelType, time, isSelected, wsPositions, wsConnected, useServerPositions }) {
  const groupRef = useRef()
  
  // Update position each frame
  useFrame(() => {
    if (!groupRef.current) return
    
    const position = getPosition(satellite, time || new Date(), wsPositions, wsConnected, useServerPositions)
    if (position) {
      groupRef.current.position.set(position.x, position.y, position.z)
      
      // Orient satellite to face Earth (nadir pointing)
      const earthCenter = new THREE.Vector3(0, 0, 0)
      groupRef.current.lookAt(earthCenter)
    }
  })
  
  const ModelComponent = {
    iss: ISSModel,
    hubble: HubbleModel,
    css: CSSModel,
    gps: GPSModel,
    starlink: StarlinkModel,
    iridium: IridiumModel,
    generic: GenericSatellite,
  }[modelType] || GenericSatellite
  
  return (
    <group ref={groupRef}>
      <ModelComponent isSelected={isSelected} time={time} color={satellite.color} />
    </group>
  )
}

/**
 * ISS Model - International Space Station
 * Detailed with all major modules and solar arrays
 */
function ISSModel({ isSelected, time }) {
  const groupRef = useRef()
  const solarPanelsRef = useRef()
  
  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.05
    }
    // Solar panel sun tracking
    if (solarPanelsRef.current && time) {
      const sunDir = getSunDirection(time)
      const angle = Math.atan2(sunDir.x, sunDir.z)
      solarPanelsRef.current.rotation.y = angle * 0.3
    }
  })
  
  const scale = isSelected ? 0.15 : 0.08
  
  return (
    <group ref={groupRef} scale={scale}>
      {/* Integrated Truss Structure */}
      <mesh>
        <boxGeometry args={[6, 0.15, 0.15]} />
        <meshStandardMaterial {...MATERIALS.whiteThermal} />
      </mesh>
      
      {/* Main pressurized modules */}
      {/* Zarya (FGB) */}
      <mesh position={[0, 0, 0.3]}>
        <cylinderGeometry args={[0.25, 0.25, 1.2, 12]} />
        <primitive object={MATERIALS.goldFoil.clone()} />
      </mesh>
      
      {/* Unity Node */}
      <mesh position={[0, 0, -0.3]}>
        <cylinderGeometry args={[0.22, 0.22, 0.6, 12]} />
        <primitive object={MATERIALS.whiteThermal.clone()} />
      </mesh>
      
      {/* Destiny Lab */}
      <mesh position={[0, 0, -1]} rotation={[Math.PI/2, 0, 0]}>
        <cylinderGeometry args={[0.25, 0.25, 1, 12]} />
        <primitive object={MATERIALS.whiteThermal.clone()} />
      </mesh>
      
      {/* Columbus (ESA) */}
      <mesh position={[0.5, 0, -0.5]} rotation={[0, 0, Math.PI/2]}>
        <cylinderGeometry args={[0.18, 0.18, 0.5, 12]} />
        <primitive object={MATERIALS.whiteThermal.clone()} />
      </mesh>
      
      {/* Kibo (JAXA) */}
      <mesh position={[-0.5, 0, -0.5]} rotation={[0, 0, Math.PI/2]}>
        <cylinderGeometry args={[0.2, 0.2, 0.7, 12]} />
        <primitive object={MATERIALS.whiteThermal.clone()} />
      </mesh>
      
      {/* Solar Array Wings */}
      <group ref={solarPanelsRef}>
        {/* Port side arrays */}
        <SolarArray position={[-2.2, 0, 0]} rotation={[0, 0, 0]} />
        <SolarArray position={[-3.5, 0, 0]} rotation={[0, 0, 0]} />
        
        {/* Starboard side arrays */}
        <SolarArray position={[2.2, 0, 0]} rotation={[0, 0, 0]} />
        <SolarArray position={[3.5, 0, 0]} rotation={[0, 0, 0]} />
      </group>
      
      {/* Radiators */}
      <mesh position={[0, 0.4, 0]} rotation={[Math.PI/2, 0, 0]}>
        <boxGeometry args={[1.2, 0.02, 0.5]} />
        <primitive object={MATERIALS.whiteThermal.clone()} />
      </mesh>
      
      {/* Selection glow */}
      {isSelected && <SelectionGlow color="#f59e0b" />}
    </group>
  )
}

/**
 * Solar Array component - reusable for multiple satellites
 */
function SolarArray({ position, rotation, width = 1.5, height = 0.6 }) {
  return (
    <group position={position} rotation={rotation}>
      {/* Solar panel frame */}
      <mesh>
        <boxGeometry args={[width, 0.02, height]} />
        <primitive object={MATERIALS.solarBacking.clone()} />
      </mesh>
      {/* Solar cells */}
      <mesh position={[0, 0.015, 0]}>
        <boxGeometry args={[width - 0.05, 0.01, height - 0.05]} />
        <primitive object={MATERIALS.solarCell.clone()} />
      </mesh>
      {/* Cell grid lines */}
      {[-0.5, 0, 0.5].map((x, i) => (
        <mesh key={i} position={[x * (width - 0.2), 0.02, 0]}>
          <boxGeometry args={[0.02, 0.01, height - 0.1]} />
          <meshBasicMaterial color="#111" />
        </mesh>
      ))}
    </group>
  )
}

/**
 * Hubble Space Telescope Model
 */
function HubbleModel({ isSelected, time }) {
  const groupRef = useRef()
  
  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.x += delta * 0.02
    }
  })
  
  const scale = isSelected ? 0.12 : 0.06
  
  return (
    <group ref={groupRef} scale={scale}>
      {/* Main telescope tube */}
      <mesh>
        <cylinderGeometry args={[0.4, 0.4, 2.8, 24]} />
        <primitive object={MATERIALS.goldFoil.clone()} />
      </mesh>
      
      {/* Forward shell (silver) */}
      <mesh position={[0, 1.2, 0]}>
        <cylinderGeometry args={[0.42, 0.38, 0.4, 24]} />
        <primitive object={MATERIALS.antenna.clone()} />
      </mesh>
      
      {/* Aperture door */}
      <mesh position={[0, 1.45, 0]}>
        <cylinderGeometry args={[0.35, 0.35, 0.08, 24]} />
        <primitive object={MATERIALS.blackThermal.clone()} />
      </mesh>
      
      {/* Aft shroud */}
      <mesh position={[0, -1.2, 0]}>
        <cylinderGeometry args={[0.42, 0.4, 0.4, 24]} />
        <primitive object={MATERIALS.goldFoil.clone()} />
      </mesh>
      
      {/* Solar arrays */}
      {[-1, 1].map(side => (
        <group key={side} position={[side * 1.4, 0, 0]}>
          <SolarArray width={1.8} height={0.4} />
        </group>
      ))}
      
      {/* High-gain antennas */}
      <mesh position={[0, -1.5, 0.4]}>
        <cylinderGeometry args={[0.02, 0.02, 0.5, 8]} />
        <primitive object={MATERIALS.antenna.clone()} />
      </mesh>
      <mesh position={[0, -1.8, 0.4]}>
        <sphereGeometry args={[0.1, 12, 12]} />
        <primitive object={MATERIALS.whiteThermal.clone()} />
      </mesh>
      
      {isSelected && <SelectionGlow color="#8b5cf6" />}
    </group>
  )
}

/**
 * CSS (Chinese Space Station) Model
 */
function CSSModel({ isSelected, time }) {
  const groupRef = useRef()
  const solarRef = useRef()
  
  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.04
    }
    if (solarRef.current && time) {
      const sunDir = getSunDirection(time)
      solarRef.current.rotation.y = Math.atan2(sunDir.x, sunDir.z) * 0.3
    }
  })
  
  const scale = isSelected ? 0.12 : 0.06
  
  return (
    <group ref={groupRef} scale={scale}>
      {/* Tianhe core module */}
      <mesh>
        <cylinderGeometry args={[0.35, 0.35, 2.2, 12]} />
        <primitive object={MATERIALS.whiteThermal.clone()} />
      </mesh>
      
      {/* Gold thermal bands */}
      {[-0.6, 0, 0.6].map((y, i) => (
        <mesh key={i} position={[0, y, 0]}>
          <cylinderGeometry args={[0.36, 0.36, 0.15, 12]} />
          <primitive object={MATERIALS.goldFoil.clone()} />
        </mesh>
      ))}
      
      {/* Wentian lab module */}
      <mesh position={[0.8, 0, 0]} rotation={[0, 0, Math.PI/2]}>
        <cylinderGeometry args={[0.3, 0.3, 1.4, 12]} />
        <primitive object={MATERIALS.whiteThermal.clone()} />
      </mesh>
      
      {/* Mengtian lab module */}
      <mesh position={[-0.8, 0, 0]} rotation={[0, 0, Math.PI/2]}>
        <cylinderGeometry args={[0.3, 0.3, 1.4, 12]} />
        <primitive object={MATERIALS.whiteThermal.clone()} />
      </mesh>
      
      {/* Solar arrays */}
      <group ref={solarRef}>
        <SolarArray position={[0, 0, 1.8]} rotation={[Math.PI/2, 0, 0]} width={0.8} height={2.5} />
        <SolarArray position={[0, 0, -1.8]} rotation={[Math.PI/2, 0, 0]} width={0.8} height={2.5} />
        <SolarArray position={[1.8, 0, 0.8]} rotation={[Math.PI/2, 0, 0]} width={0.5} height={1.5} />
        <SolarArray position={[-1.8, 0, 0.8]} rotation={[Math.PI/2, 0, 0]} width={0.5} height={1.5} />
      </group>
      
      {isSelected && <SelectionGlow color="#f59e0b" />}
    </group>
  )
}

/**
 * GPS Satellite Model (Block III design)
 */
function GPSModel({ isSelected, time }) {
  const groupRef = useRef()
  const solarRef = useRef()
  
  useFrame((state, delta) => {
    if (solarRef.current && time) {
      const sunDir = getSunDirection(time)
      solarRef.current.rotation.y = Math.atan2(sunDir.x, sunDir.z)
    }
  })
  
  const scale = isSelected ? 0.1 : 0.05
  
  return (
    <group ref={groupRef} scale={scale}>
      {/* Main bus (box shape) */}
      <mesh>
        <boxGeometry args={[0.8, 0.8, 1.2]} />
        <primitive object={MATERIALS.goldFoil.clone()} />
      </mesh>
      
      {/* Earth-facing panel (nadir) */}
      <mesh position={[0, -0.5, 0]}>
        <boxGeometry args={[0.7, 0.1, 1]} />
        <primitive object={MATERIALS.blackThermal.clone()} />
      </mesh>
      
      {/* L-band antenna array */}
      <mesh position={[0, -0.6, 0]}>
        <cylinderGeometry args={[0.25, 0.3, 0.15, 12]} />
        <primitive object={MATERIALS.whiteThermal.clone()} />
      </mesh>
      
      {/* Solar arrays - distinctive GPS wings */}
      <group ref={solarRef}>
        <SolarArray position={[-1.5, 0, 0]} width={2} height={0.8} />
        <SolarArray position={[1.5, 0, 0]} width={2} height={0.8} />
      </group>
      
      {/* UHF antenna */}
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.4, 8]} />
        <primitive object={MATERIALS.antenna.clone()} />
      </mesh>
      
      {isSelected && <SelectionGlow color="#22c55e" />}
    </group>
  )
}

/**
 * Starlink Satellite Model (v1.5/v2 design)
 * Distinctive flat panel design
 */
function StarlinkModel({ isSelected }) {
  const groupRef = useRef()
  
  useFrame((state, delta) => {
    if (groupRef.current) {
      // Starlink satellites have a distinctive flat orientation
      groupRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.5) * 0.1
    }
  })
  
  const scale = isSelected ? 0.08 : 0.03
  
  return (
    <group ref={groupRef} scale={scale}>
      {/* Main flat body */}
      <mesh>
        <boxGeometry args={[1.5, 0.1, 0.8]} />
        <primitive object={MATERIALS.starlinkPanel.clone()} />
      </mesh>
      
      {/* Solar panel (single large panel) */}
      <mesh position={[0, 0.02, 1]} rotation={[0.2, 0, 0]}>
        <boxGeometry args={[1.4, 0.02, 1.5]} />
        <primitive object={MATERIALS.solarCell.clone()} />
      </mesh>
      
      {/* Phased array antennas (flat) */}
      <mesh position={[0, -0.08, 0]}>
        <boxGeometry args={[1.2, 0.03, 0.6]} />
        <primitive object={MATERIALS.blackThermal.clone()} />
      </mesh>
      
      {/* Star tracker */}
      <mesh position={[0.5, 0.1, 0]}>
        <boxGeometry args={[0.1, 0.1, 0.1]} />
        <primitive object={MATERIALS.blackThermal.clone()} />
      </mesh>
      
      {/* Krypton ion thruster */}
      <mesh position={[-0.6, 0, -0.3]}>
        <cylinderGeometry args={[0.05, 0.08, 0.15, 8]} />
        <primitive object={MATERIALS.antenna.clone()} />
      </mesh>
      
      {isSelected && <SelectionGlow color="#3b82f6" />}
    </group>
  )
}

/**
 * Iridium NEXT Satellite Model
 */
function IridiumModel({ isSelected, time }) {
  const groupRef = useRef()
  const solarRef = useRef()
  
  useFrame(() => {
    if (solarRef.current && time) {
      const sunDir = getSunDirection(time)
      solarRef.current.rotation.z = Math.atan2(sunDir.y, sunDir.x) * 0.5
    }
  })
  
  const scale = isSelected ? 0.08 : 0.04
  
  return (
    <group ref={groupRef} scale={scale}>
      {/* Main bus - triangular prism shape */}
      <mesh>
        <cylinderGeometry args={[0.4, 0.4, 1.5, 3]} />
        <primitive object={MATERIALS.goldFoil.clone()} />
      </mesh>
      
      {/* Main Mission Antenna (MMA) - distinctive panels */}
      {[0, 120, 240].map((angle, i) => (
        <mesh 
          key={i} 
          position={[
            Math.cos(angle * Math.PI / 180) * 0.5,
            0,
            Math.sin(angle * Math.PI / 180) * 0.5
          ]}
          rotation={[0, -angle * Math.PI / 180, 0]}
        >
          <boxGeometry args={[0.02, 1.2, 0.4]} />
          <primitive object={MATERIALS.starlinkPanel.clone()} />
        </mesh>
      ))}
      
      {/* Solar arrays */}
      <group ref={solarRef}>
        <SolarArray position={[-1.2, 0, 0]} width={1.8} height={0.5} />
        <SolarArray position={[1.2, 0, 0]} width={1.8} height={0.5} />
      </group>
      
      {/* L-band antenna */}
      <mesh position={[0, -0.9, 0]}>
        <coneGeometry args={[0.25, 0.3, 12]} />
        <primitive object={MATERIALS.whiteThermal.clone()} />
      </mesh>
      
      {isSelected && <SelectionGlow color="#a855f7" />}
    </group>
  )
}

/**
 * Generic satellite fallback - simple but visible
 */
function GenericSatellite({ color = '#10b981', isSelected }) {
  const scale = isSelected ? 0.06 : 0.03
  
  return (
    <group scale={scale}>
      {/* Simple bus */}
      <mesh>
        <boxGeometry args={[0.6, 0.6, 0.8]} />
        <meshStandardMaterial color={color} metalness={0.5} roughness={0.5} />
      </mesh>
      
      {/* Simple solar panels */}
      <mesh position={[-0.8, 0, 0]}>
        <boxGeometry args={[0.8, 0.02, 0.4]} />
        <primitive object={MATERIALS.solarCell.clone()} />
      </mesh>
      <mesh position={[0.8, 0, 0]}>
        <boxGeometry args={[0.8, 0.02, 0.4]} />
        <primitive object={MATERIALS.solarCell.clone()} />
      </mesh>
      
      {isSelected && <SelectionGlow color={color} />}
    </group>
  )
}

/**
 * Selection glow effect
 */
function SelectionGlow({ color = '#00d4ff' }) {
  return (
    <>
      <pointLight color={color} intensity={2} distance={3} />
      <mesh>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.3} />
      </mesh>
    </>
  )
}
