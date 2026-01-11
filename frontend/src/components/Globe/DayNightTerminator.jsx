import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../../stores/useStore'
import { EARTH_RADIUS_KM, SCALE_FACTOR } from '../../services/satelliteService'

const EARTH_RADIUS = EARTH_RADIUS_KM * SCALE_FACTOR

/**
 * Day/Night Terminator - Shows the shadow line on Earth
 * The terminator is the line dividing day and night
 */
export default function DayNightTerminator() {
  const meshRef = useRef()
  const { currentTime, showTerminator } = useStore()
  
  // Calculate sun position based on current time
  const sunDirection = useMemo(() => {
    const date = currentTime || new Date()
    
    // Calculate sun position
    // The sun's position changes based on Earth's rotation and orbit
    const dayOfYear = Math.floor((date - new Date(date.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24))
    const hourUTC = date.getUTCHours() + date.getUTCMinutes() / 60
    
    // Sun's declination (simplified)
    const declination = -23.45 * Math.cos((360 / 365) * (dayOfYear + 10) * (Math.PI / 180))
    
    // Hour angle - sun position based on time
    const hourAngle = (hourUTC - 12) * 15 // 15 degrees per hour
    
    // Convert to 3D vector
    const decRad = declination * (Math.PI / 180)
    const haRad = hourAngle * (Math.PI / 180)
    
    return new THREE.Vector3(
      Math.cos(decRad) * Math.sin(haRad),
      Math.sin(decRad),
      Math.cos(decRad) * Math.cos(haRad)
    ).normalize()
  }, [currentTime])
  
  // Update terminator position each frame
  useFrame(() => {
    if (meshRef.current && showTerminator) {
      // Point the shadow hemisphere away from the sun
      meshRef.current.lookAt(sunDirection.clone().multiplyScalar(-100))
    }
  })
  
  // Custom shader for smooth terminator gradient
  const terminatorMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        sunDirection: { value: sunDirection },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 sunDirection;
        varying vec3 vNormal;
        varying vec3 vPosition;
        
        void main() {
          // Calculate how much this point faces the sun
          float sunFacing = dot(normalize(vPosition), sunDirection);
          
          // Create gradient at terminator (-0.1 to 0.1 is the transition zone)
          float shadow = smoothstep(-0.15, 0.1, sunFacing);
          
          // Night side is dark blue/black
          vec3 nightColor = vec3(0.0, 0.02, 0.08);
          
          // Fully transparent on day side
          float alpha = (1.0 - shadow) * 0.7;
          
          gl_FragColor = vec4(nightColor, alpha);
        }
      `,
      transparent: true,
      side: THREE.FrontSide,
      depthWrite: false,
    })
  }, [sunDirection])
  
  // Update shader uniform when sun direction changes
  useMemo(() => {
    if (terminatorMaterial.uniforms) {
      terminatorMaterial.uniforms.sunDirection.value = sunDirection
    }
  }, [sunDirection, terminatorMaterial])
  
  if (!showTerminator) return null
  
  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[EARTH_RADIUS * 1.003, 64, 64]} />
      <primitive object={terminatorMaterial} attach="material" />
    </mesh>
  )
}

/**
 * Sun indicator - shows sun position in the scene
 */
export function SunIndicator() {
  const { currentTime, showTerminator } = useStore()
  
  const sunPosition = useMemo(() => {
    const date = currentTime || new Date()
    
    const dayOfYear = Math.floor((date - new Date(date.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24))
    const hourUTC = date.getUTCHours() + date.getUTCMinutes() / 60
    
    const declination = -23.45 * Math.cos((360 / 365) * (dayOfYear + 10) * (Math.PI / 180))
    const hourAngle = (hourUTC - 12) * 15
    
    const decRad = declination * (Math.PI / 180)
    const haRad = hourAngle * (Math.PI / 180)
    
    // Place sun far away
    const distance = 100
    return [
      Math.cos(decRad) * Math.sin(haRad) * distance,
      Math.sin(decRad) * distance,
      Math.cos(decRad) * Math.cos(haRad) * distance
    ]
  }, [currentTime])
  
  if (!showTerminator) return null
  
  return (
    <group position={sunPosition}>
      {/* Sun glow */}
      <pointLight intensity={2} color="#fff5e0" distance={200} />
      <mesh>
        <sphereGeometry args={[2, 16, 16]} />
        <meshBasicMaterial color="#ffdd00" />
      </mesh>
      {/* Sun corona */}
      <mesh>
        <sphereGeometry args={[3, 16, 16]} />
        <meshBasicMaterial color="#ffaa00" transparent opacity={0.3} />
      </mesh>
    </group>
  )
}
