import { useRef, useMemo } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import { TextureLoader } from 'three'
import * as THREE from 'three'
import { useStore } from '../../stores/useStore'
import { EARTH_RADIUS_KM, SCALE_FACTOR } from '../../services/satelliteService'

// Earth radius in Three.js units
const EARTH_RADIUS = EARTH_RADIUS_KM * SCALE_FACTOR

export default function Earth() {
  const earthRef = useRef()
  const cloudsRef = useRef()
  const { animationSpeed, isRealTime } = useStore()
  
  // Load textures from NASA/public sources with CORS support
  // Using jsdelivr CDN which has proper CORS headers
  const [earthTexture, bumpTexture] = useLoader(
    TextureLoader,
    [
      'https://cdn.jsdelivr.net/gh/mrdoob/three.js@dev/examples/textures/planets/earth_atmos_2048.jpg',
      'https://cdn.jsdelivr.net/gh/mrdoob/three.js@dev/examples/textures/planets/earth_normal_2048.jpg',
    ]
  )
  
  // Create custom shader material for day/night effect
  const earthMaterial = useMemo(() => {
    return new THREE.MeshPhongMaterial({
      map: earthTexture,
      bumpMap: bumpTexture,
      bumpScale: 0.05,
      specular: new THREE.Color(0x333333),
      shininess: 15,
    })
  }, [earthTexture, bumpTexture])
  
  // Rotate Earth
  useFrame((state, delta) => {
    if (earthRef.current && isRealTime) {
      // Earth rotates 360° in 24 hours = 0.0042° per second
      // Speed up for visualization
      earthRef.current.rotation.y += delta * 0.01 * animationSpeed
    }
    
    if (cloudsRef.current && isRealTime) {
      // Clouds rotate slightly faster than Earth
      cloudsRef.current.rotation.y += delta * 0.012 * animationSpeed
    }
  })

  return (
    <group>
      {/* Main Earth Sphere */}
      <mesh ref={earthRef} castShadow receiveShadow>
        <sphereGeometry args={[EARTH_RADIUS, 64, 64]} />
        <primitive object={earthMaterial} attach="material" />
      </mesh>
      
      {/* Cloud Layer - Procedural clouds using noise */}
      <mesh ref={cloudsRef}>
        <sphereGeometry args={[EARTH_RADIUS * 1.01, 64, 64]} />
        <meshPhongMaterial
          color="#ffffff"
          transparent
          opacity={0.15}
          depthWrite={false}
        />
      </mesh>
      
      {/* Latitude/Longitude Grid */}
      <GridLines radius={EARTH_RADIUS * 1.002} />
    </group>
  )
}

// Grid lines for lat/long visualization
function GridLines({ radius }) {
  const gridRef = useRef()
  
  const geometry = useMemo(() => {
    const points = []
    const segments = 36
    
    // Latitude lines
    for (let lat = -60; lat <= 60; lat += 30) {
      const phi = (90 - lat) * (Math.PI / 180)
      const r = radius * Math.sin(phi)
      const y = radius * Math.cos(phi)
      
      for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * Math.PI * 2
        points.push(new THREE.Vector3(
          r * Math.cos(theta),
          y,
          r * Math.sin(theta)
        ))
      }
      // Close the loop
      points.push(new THREE.Vector3(NaN, NaN, NaN))
    }
    
    // Longitude lines
    for (let lng = 0; lng < 360; lng += 30) {
      const theta = lng * (Math.PI / 180)
      
      for (let i = 0; i <= segments; i++) {
        const phi = (i / segments) * Math.PI
        points.push(new THREE.Vector3(
          radius * Math.sin(phi) * Math.cos(theta),
          radius * Math.cos(phi),
          radius * Math.sin(phi) * Math.sin(theta)
        ))
      }
      points.push(new THREE.Vector3(NaN, NaN, NaN))
    }
    
    const geometry = new THREE.BufferGeometry().setFromPoints(
      points.filter(p => !isNaN(p.x))
    )
    
    return geometry
  }, [radius])
  
  return (
    <lineSegments ref={gridRef}>
      <primitive object={geometry} attach="geometry" />
      <lineBasicMaterial 
        color="#00d4ff" 
        transparent 
        opacity={0.1}
        linewidth={1}
      />
    </lineSegments>
  )
}
