import { useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Stars, PerspectiveCamera } from '@react-three/drei'
import * as THREE from 'three'
import { useStore } from '../../stores/useStore'
import Earth from './Earth'
import Satellites from './Satellites'
import Atmosphere from './Atmosphere'
import DayNightTerminator, { SunIndicator } from './DayNightTerminator'
import GroundMarker from './GroundMarker'
import SatelliteModels from './SatelliteModels'

export default function Scene() {
  const controlsRef = useRef()
  const { camera } = useThree()
  const { 
    selectedSatellite, 
    isTracking, 
    cameraTarget,
    animationSpeed,
    setSimulationTime,
    isRealTime,
    isPaused,
    setCameraPosition,
  } = useStore()
  
  // Update simulation time and camera position
  useFrame((state, delta) => {
    if (isRealTime && !isPaused) {
      setSimulationTime(new Date())
    }
    
    // Track camera position for sharing
    if (camera) {
      setCameraPosition(
        { x: camera.position.x, y: camera.position.y, z: camera.position.z },
        { x: camera.rotation.x, y: camera.rotation.y, z: camera.rotation.z }
      )
    }
    
    // Smooth camera tracking
    if (isTracking && cameraTarget && cameraTarget.position) {
      const targetPos = new THREE.Vector3(
        cameraTarget.position.x,
        cameraTarget.position.y,
        cameraTarget.position.z
      )
      
      // Move camera to follow satellite
      const distance = 5
      const direction = targetPos.clone().normalize()
      const cameraPos = targetPos.clone().add(direction.multiplyScalar(distance))
      
      camera.position.lerp(cameraPos, 0.02)
      
      if (controlsRef.current) {
        controlsRef.current.target.lerp(targetPos, 0.02)
      }
    }
  })

  return (
    <>
      {/* Camera */}
      <PerspectiveCamera makeDefault position={[0, 0, 30]} fov={45} />
      
      {/* Controls */}
      <OrbitControls
        ref={controlsRef}
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={8}
        maxDistance={100}
        rotateSpeed={0.5}
        zoomSpeed={0.8}
        panSpeed={0.5}
        enableDamping={true}
        dampingFactor={0.05}
      />
      
      {/* Lighting */}
      <ambientLight intensity={0.1} />
      <directionalLight
        position={[50, 30, 50]}
        intensity={2}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <pointLight position={[-30, -30, -30]} intensity={0.3} color="#4a90d9" />
      
      {/* Stars Background */}
      <Stars
        radius={300}
        depth={100}
        count={8000}
        factor={4}
        saturation={0}
        fade
        speed={0.5}
      />
      
      {/* Earth */}
      <Earth />
      
      {/* Day/Night Terminator */}
      <DayNightTerminator />
      
      {/* Atmosphere Glow */}
      <Atmosphere />
      
      {/* Sun indicator */}
      <SunIndicator />
      
      {/* Satellites */}
      <Satellites />
      
      {/* 3D Satellite Models (ISS, Hubble, etc.) */}
      <SatelliteModels />
      
      {/* User location marker */}
      <GroundMarker />
      
      {/* Ambient space dust/particles */}
      <SpaceDust />
    </>
  )
}

// Ambient space particles for atmosphere
function SpaceDust() {
  const particlesRef = useRef()
  const count = 500
  
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  
  for (let i = 0; i < count; i++) {
    // Random positions in a sphere shell
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    const r = 50 + Math.random() * 150
    
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
    positions[i * 3 + 2] = r * Math.cos(phi)
    
    // Slight color variation
    colors[i * 3] = 0.5 + Math.random() * 0.5
    colors[i * 3 + 1] = 0.7 + Math.random() * 0.3
    colors[i * 3 + 2] = 1
  }
  
  useFrame((state) => {
    if (particlesRef.current) {
      particlesRef.current.rotation.y += 0.0001
    }
  })
  
  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={count}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.1}
        vertexColors
        transparent
        opacity={0.6}
        sizeAttenuation
      />
    </points>
  )
}
