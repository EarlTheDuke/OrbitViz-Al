import { useRef, useMemo, useCallback, useEffect, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { useStore } from '../../stores/useStore'
import { 
  getPositionAtTime, 
  getOrbitPath, 
  getColorForType,
  SCALE_FACTOR 
} from '../../services/satelliteService'

export default function Satellites() {
  const { 
    filteredSatellites, 
    selectedSatellite, 
    setSelectedSatellite,
    setHoveredSatellite,
    hoveredSatellite,
    showOrbits,
    showLabels,
    simulationTime,
    isLoading,
    wsConnected,
    wsPositions,
    useServerPositions,
  } = useStore()
  
  const { camera, raycaster, pointer } = useThree()
  const meshRef = useRef()
  const instancedMeshRef = useRef()
  const hoveredRef = useRef(null)
  
  // Create instanced geometry for performance
  const satelliteCount = filteredSatellites.length
  
  // Dummy object for matrix calculations
  const dummy = useMemo(() => new THREE.Object3D(), [])
  
  // Color array for instanced mesh
  const colors = useMemo(() => {
    const colorArray = new Float32Array(Math.max(satelliteCount, 1) * 3)
    
    filteredSatellites.forEach((sat, i) => {
      const color = new THREE.Color(sat.color || getColorForType(sat.type))
      colorArray[i * 3] = color.r
      colorArray[i * 3 + 1] = color.g
      colorArray[i * 3 + 2] = color.b
    })
    
    return colorArray
  }, [filteredSatellites, satelliteCount])
  
  // Update satellite positions each frame
  useFrame((state) => {
    if (!instancedMeshRef.current || satelliteCount === 0) return
    
    const time = simulationTime || new Date()
    const useWsPositions = wsConnected && useServerPositions
    
    filteredSatellites.forEach((sat, i) => {
      let position = null
      
      // Try to use WebSocket position first if connected
      if (useWsPositions && wsPositions[sat.noradId]) {
        position = wsPositions[sat.noradId]
      } else {
        // Fall back to client-side calculation
        position = getPositionAtTime(sat.satrec, time)
      }
      
      if (position) {
        dummy.position.set(position.x, position.y, position.z)
        
        // Scale up selected/hovered satellites
        const isSelected = selectedSatellite?.noradId === sat.noradId
        const isHovered = hoveredRef.current === i
        const scale = isSelected ? 2 : isHovered ? 1.5 : 1
        
        dummy.scale.setScalar(scale)
        dummy.updateMatrix()
        instancedMeshRef.current.setMatrixAt(i, dummy.matrix)
      }
    })
    
    instancedMeshRef.current.instanceMatrix.needsUpdate = true
  })
  
  // Handle hover detection
  const handlePointerMove = useCallback((event) => {
    if (!instancedMeshRef.current || satelliteCount === 0) return
    
    raycaster.setFromCamera(pointer, camera)
    const intersects = raycaster.intersectObject(instancedMeshRef.current)
    
    if (intersects.length > 0) {
      const instanceId = intersects[0].instanceId
      if (instanceId !== hoveredRef.current) {
        hoveredRef.current = instanceId
        const satellite = filteredSatellites[instanceId]
        if (satellite) {
          setHoveredSatellite(satellite)
          document.body.style.cursor = 'pointer'
        }
      }
    } else {
      if (hoveredRef.current !== null) {
        hoveredRef.current = null
        setHoveredSatellite(null)
        document.body.style.cursor = 'auto'
      }
    }
  }, [camera, raycaster, pointer, filteredSatellites, satelliteCount, setHoveredSatellite])
  
  // Handle click
  const handleClick = useCallback((event) => {
    if (!instancedMeshRef.current || satelliteCount === 0) return
    
    raycaster.setFromCamera(pointer, camera)
    const intersects = raycaster.intersectObject(instancedMeshRef.current)
    
    if (intersects.length > 0) {
      const instanceId = intersects[0].instanceId
      const satellite = filteredSatellites[instanceId]
      if (satellite) {
        setSelectedSatellite(satellite)
      }
    }
  }, [camera, raycaster, pointer, filteredSatellites, satelliteCount, setSelectedSatellite])
  
  // Set up event listeners
  useEffect(() => {
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('click', handleClick)
    
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('click', handleClick)
      document.body.style.cursor = 'auto'
    }
  }, [handlePointerMove, handleClick])

  if (isLoading || satelliteCount === 0) {
    return null
  }

  return (
    <group ref={meshRef}>
      {/* Instanced satellites for performance */}
      <instancedMesh 
        ref={instancedMeshRef}
        args={[null, null, satelliteCount]}
        frustumCulled={false}
      >
        <sphereGeometry args={[0.03, 8, 8]} />
        <meshBasicMaterial vertexColors />
        <instancedBufferAttribute
          attach="geometry-attributes-color"
          args={[colors, 3]}
        />
      </instancedMesh>
      
      {/* Selected satellite orbit */}
      {showOrbits && selectedSatellite && (
        <OrbitPath 
          satellite={selectedSatellite} 
          color={selectedSatellite.color}
          opacity={0.8}
        />
      )}
      
      {/* Selected satellite highlight */}
      {selectedSatellite && (
        <SatelliteHighlight satellite={selectedSatellite} time={simulationTime} />
      )}
      
      {/* 3D Labels for hovered/selected satellites */}
      {showLabels && hoveredSatellite && !selectedSatellite && (
        <SatelliteLabel satellite={hoveredSatellite} time={simulationTime} />
      )}
      
      {showLabels && selectedSatellite && (
        <SatelliteLabel satellite={selectedSatellite} time={simulationTime} isSelected />
      )}
    </group>
  )
}

// Orbital path visualization
function OrbitPath({ satellite, color = '#00d4ff', opacity = 0.5 }) {
  const lineRef = useRef()
  
  const points = useMemo(() => {
    if (!satellite?.satrec) return []
    
    const orbitPoints = getOrbitPath(satellite.satrec, 180)
    return orbitPoints.map(p => new THREE.Vector3(p.x, p.y, p.z))
  }, [satellite])
  
  if (points.length === 0) return null
  
  return (
    <line ref={lineRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={points.length}
          array={new Float32Array(points.flatMap(p => [p.x, p.y, p.z]))}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial 
        color={color} 
        transparent 
        opacity={opacity}
        linewidth={2}
      />
    </line>
  )
}

// Highlight ring around selected satellite
function SatelliteHighlight({ satellite, time }) {
  const groupRef = useRef()
  const ringRef = useRef()
  
  useFrame((state) => {
    if (!groupRef.current || !satellite?.satrec) return
    
    const position = getPositionAtTime(satellite.satrec, time || new Date())
    if (position) {
      groupRef.current.position.set(position.x, position.y, position.z)
    }
    
    if (ringRef.current) {
      ringRef.current.rotation.z += 0.02
    }
  })
  
  return (
    <group ref={groupRef}>
      {/* Pulsing ring */}
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.08, 0.12, 32]} />
        <meshBasicMaterial 
          color={satellite.color || '#00d4ff'} 
          transparent 
          opacity={0.8}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      {/* Outer glow ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.12, 0.18, 32]} />
        <meshBasicMaterial 
          color={satellite.color || '#00d4ff'} 
          transparent 
          opacity={0.3}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      {/* Point light for glow effect */}
      <pointLight 
        color={satellite.color || '#00d4ff'} 
        intensity={0.5} 
        distance={1}
      />
    </group>
  )
}

// 3D Label that follows a satellite
function SatelliteLabel({ satellite, time, isSelected = false }) {
  const groupRef = useRef()
  
  useFrame(() => {
    if (!groupRef.current || !satellite?.satrec) return
    
    const position = getPositionAtTime(satellite.satrec, time || new Date())
    if (position) {
      groupRef.current.position.set(position.x, position.y, position.z)
    }
  })
  
  return (
    <group ref={groupRef}>
      <Html
        center
        distanceFactor={15}
        occlude={false}
        style={{
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        <div 
          className={`px-2 py-1 rounded-md text-xs font-mono whitespace-nowrap
            backdrop-blur-sm border transition-all ${
            isSelected 
              ? 'bg-cyber-blue/30 border-cyber-blue/50 text-white shadow-lg shadow-cyber-blue/20' 
              : 'bg-space-900/80 border-space-600/50 text-space-300'
          }`}
          style={{
            transform: 'translateY(-20px)',
          }}
        >
          <div className="flex items-center gap-2">
            <div 
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: satellite.color || '#00d4ff' }}
            />
            <span>{satellite.name}</span>
          </div>
          {isSelected && (
            <div className="text-[10px] text-space-400 mt-0.5">
              Alt: {satellite.altitude?.toLocaleString() || '---'} km
            </div>
          )}
        </div>
      </Html>
    </group>
  )
}
