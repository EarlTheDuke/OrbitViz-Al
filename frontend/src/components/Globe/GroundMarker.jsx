import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { useStore } from '../../stores/useStore'
import { EARTH_RADIUS_KM, SCALE_FACTOR } from '../../services/satelliteService'

const EARTH_RADIUS = EARTH_RADIUS_KM * SCALE_FACTOR

/**
 * Ground Marker - Shows user's location on the globe
 */
export default function GroundMarker() {
  const { userLocation, showGroundMarker } = useStore()
  const markerRef = useRef()
  const ringRef = useRef()
  const pulseRef = useRef()
  
  // Convert lat/lng to 3D position
  const position = useMemo(() => {
    if (!userLocation) return null
    
    const latRad = userLocation.latitude * Math.PI / 180
    const lngRad = userLocation.longitude * Math.PI / 180
    
    // Position slightly above Earth surface
    const r = EARTH_RADIUS * 1.005
    
    return new THREE.Vector3(
      r * Math.cos(latRad) * Math.sin(lngRad),
      r * Math.sin(latRad),
      r * Math.cos(latRad) * Math.cos(lngRad)
    )
  }, [userLocation])
  
  // Calculate the up direction (normal to Earth surface at this point)
  const upDirection = useMemo(() => {
    if (!position) return new THREE.Vector3(0, 1, 0)
    return position.clone().normalize()
  }, [position])
  
  // Animate the marker
  useFrame((state, delta) => {
    if (ringRef.current) {
      ringRef.current.rotation.z += delta * 0.5
    }
    if (pulseRef.current) {
      const scale = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.2
      pulseRef.current.scale.setScalar(scale)
    }
  })
  
  if (!userLocation || !showGroundMarker || !position) {
    return null
  }
  
  return (
    <group position={position}>
      {/* Orient the marker to point away from Earth center */}
      <group quaternion={new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        upDirection
      )}>
        {/* Main marker pin */}
        <mesh>
          <coneGeometry args={[0.03, 0.08, 8]} />
          <meshBasicMaterial color="#10b981" />
        </mesh>
        
        {/* Base ring */}
        <mesh ref={ringRef} position={[0, -0.02, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.04, 0.06, 32]} />
          <meshBasicMaterial color="#10b981" transparent opacity={0.8} side={THREE.DoubleSide} />
        </mesh>
        
        {/* Pulse effect */}
        <mesh ref={pulseRef} position={[0, -0.02, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.06, 0.08, 32]} />
          <meshBasicMaterial color="#10b981" transparent opacity={0.3} side={THREE.DoubleSide} />
        </mesh>
        
        {/* Glow sphere */}
        <mesh>
          <sphereGeometry args={[0.02, 16, 16]} />
          <meshBasicMaterial color="#10b981" />
        </mesh>
        
        {/* Point light for glow */}
        <pointLight color="#10b981" intensity={0.3} distance={0.5} />
        
        {/* Label */}
        <Html
          position={[0, 0.12, 0]}
          center
          distanceFactor={15}
          occlude={false}
          style={{
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          <div className="px-2 py-1 rounded bg-cyber-green/20 backdrop-blur-sm border border-cyber-green/50 
            text-cyber-green text-xs font-mono whitespace-nowrap">
            📍 Your Location
          </div>
        </Html>
      </group>
      
      {/* Ground circle on Earth surface */}
      <GroundCircle latitude={userLocation.latitude} longitude={userLocation.longitude} />
    </group>
  )
}

/**
 * Visibility circle on Earth surface
 */
function GroundCircle({ latitude, longitude, radius = 2500 }) {
  const points = useMemo(() => {
    const pts = []
    const segments = 64
    const radiusRad = radius / EARTH_RADIUS_KM // Convert km to radians
    
    const latRad = latitude * Math.PI / 180
    const lngRad = longitude * Math.PI / 180
    
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2
      
      // Calculate point on circle
      const circleLatRad = Math.asin(
        Math.sin(latRad) * Math.cos(radiusRad) +
        Math.cos(latRad) * Math.sin(radiusRad) * Math.cos(angle)
      )
      
      const circleLngRad = lngRad + Math.atan2(
        Math.sin(angle) * Math.sin(radiusRad) * Math.cos(latRad),
        Math.cos(radiusRad) - Math.sin(latRad) * Math.sin(circleLatRad)
      )
      
      // Convert to 3D position
      const r = EARTH_RADIUS * 1.002
      pts.push(new THREE.Vector3(
        r * Math.cos(circleLatRad) * Math.sin(circleLngRad),
        r * Math.sin(circleLatRad),
        r * Math.cos(circleLatRad) * Math.cos(circleLngRad)
      ))
    }
    
    return pts
  }, [latitude, longitude, radius])
  
  if (points.length === 0) return null
  
  return (
    <line>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={points.length}
          array={new Float32Array(points.flatMap(p => [p.x, p.y, p.z]))}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial 
        color="#10b981" 
        transparent 
        opacity={0.3}
        linewidth={1}
      />
    </line>
  )
}
