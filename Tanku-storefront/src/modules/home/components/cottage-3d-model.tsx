"use client"

import React, { useRef, useEffect, useState, useCallback } from 'react'
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera } from '@react-three/drei'
import * as THREE from 'three'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader'

// Componente para controlar la cámara con WASD
const CameraController = () => {
  const { camera } = useThree();
  // Referencia al target de la cámara
  const targetRef = useRef(new THREE.Vector3(0, -0.1, 0));
  // Referencia al controlador de órbita
  const orbitControlsRef = useRef<any>(null);
  
  // Estado para las teclas presionadas
  const [keysPressed, setKeysPressed] = useState({
    w: false,
    a: false,
    s: false,
    d: false,
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
  });

  // Configurar event listeners para teclas
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const { key } = event;
      if (keysPressed.hasOwnProperty(key)) {
        setKeysPressed((keys) => ({ ...keys, [key]: true }));
      }
    };
    
    const handleKeyUp = (event: KeyboardEvent) => {
      const { key } = event;
      if (keysPressed.hasOwnProperty(key)) {
        setKeysPressed((keys) => ({ ...keys, [key]: false }));
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);
  
  // Obtener una referencia al OrbitControls cuando esté disponible
  useEffect(() => {
    // Esta función se ejecutará en cada renderizado para buscar el control
    const checkForOrbitControls = () => {
      // Buscamos elementos con la clase de OrbitControls
      const orbitControlElement = document.querySelector('[data-orbit-controls]');
      if (orbitControlElement) {
        // Si encontramos el elemento, guardamos una referencia a su API
        const orbitControlInstance = (orbitControlElement as any).__r3f?.instance;
        if (orbitControlInstance && orbitControlInstance.target) {
          orbitControlsRef.current = orbitControlInstance;
        }
      }
    };
    
    // Intentamos encontrar los controles inmediatamente
    checkForOrbitControls();
    
    // Y configuramos un intervalo para seguir intentando si no los encontramos
    const intervalId = setInterval(() => {
      if (!orbitControlsRef.current) {
        checkForOrbitControls();
      } else {
        clearInterval(intervalId);
      }
    }, 500);
    
    return () => clearInterval(intervalId);
  }, []);

  // Actualizar la posición de la cámara en cada frame según las teclas presionadas
  useFrame(() => {
    // Velocidad de movimiento
    const speed = 0.05;
    
    // Vector de movimiento acumulado
    let moveX = 0;
    let moveY = 0;
    
    // Calcular movimiento basado en teclas presionadas
    if (keysPressed.a || keysPressed.ArrowLeft) moveX -= speed;
    if (keysPressed.d || keysPressed.ArrowRight) moveX += speed;
    if (keysPressed.w || keysPressed.ArrowUp) moveY += speed;
    if (keysPressed.s || keysPressed.ArrowDown) moveY -= speed;
    
    // Aplicar movimiento si hay cambio
    if (moveX !== 0 || moveY !== 0) {
      // Mover la cámara
      camera.position.x += moveX;
      camera.position.y += moveY;
      
      // Actualizar el target del OrbitControls si tenemos referencia
      if (orbitControlsRef.current) {
        orbitControlsRef.current.target.x += moveX;
        orbitControlsRef.current.target.y += moveY;
        orbitControlsRef.current.update();
      }
    }
    
    return null;
  });
  
  return null;
};

function CottageModel() {
  const fbx = useLoader(FBXLoader, '/cottage_fbx.fbx')
  const modelRef = useRef<THREE.Group>(null)
  const { camera } = useThree()
  
  // Load textures
  const [diffuseMap, normalMap] = useLoader(THREE.TextureLoader, [
    '/cottage_textures/cottage_diffuse.png',
    '/cottage_textures/cottage_normal.png'
  ])
  
  // Ensure textures are properly configured
  useEffect(() => {
    if (diffuseMap && normalMap) {
      // Use colorSpace instead of encoding for newer Three.js versions
      diffuseMap.colorSpace = THREE.SRGBColorSpace
      diffuseMap.flipY = false
      diffuseMap.needsUpdate = true
      
      normalMap.flipY = false
      normalMap.needsUpdate = true
    }
  }, [diffuseMap, normalMap])
  
  useEffect(() => {
    if (fbx) {
      // Apply textures to the model
      fbx.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          // Create a new material with the textures
          const material = new THREE.MeshStandardMaterial({
            map: diffuseMap,
            normalMap: normalMap,
            normalScale: new THREE.Vector2(1, 1),
            roughness: 0.7,
            metalness: 0.2,
            side: THREE.DoubleSide, // Render both sides of faces
            transparent: false,
            color: 0xffffff
          })
          child.material = material
          child.castShadow = true
          child.receiveShadow = true
        }
      })
      
      // Center the model
      const box = new THREE.Box3().setFromObject(fbx)
      const center = box.getCenter(new THREE.Vector3())
      fbx.position.sub(center)
      
      // Scale the model to be much smaller
      const size = box.getSize(new THREE.Vector3())
      const maxDim = Math.max(size.x, size.y, size.z)
      const scale = 0.001 / maxDim  // Reduced scale significantly
      fbx.scale.set(scale, scale, scale)
      
      // Set initial rotation
      fbx.rotation.y = Math.PI / 4
    }
    
    // Position camera higher above the house for a better view
    camera.position.set(3, 5, 3)  // Position camera higher up for a better perspective
    camera.lookAt(0, -0.1, 0)  // Look slightly down at the model
    
    // Set a sensible FOV for exterior view if it's a perspective camera
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = 45
      camera.updateProjectionMatrix()
    }
  }, [fbx, diffuseMap, normalMap, camera])
  
  // No frame updates needed
  useFrame(() => {
    // Left empty for potential future animations if needed
  })
  
  return <primitive ref={modelRef} object={fbx} />
}

export default function Cottage3DModel() {
  const [mounted, setMounted] = useState(false)
  
  // Only render on client side
  useEffect(() => {
    setMounted(true)
  }, [])
  
  if (!mounted) return null
  
  return (
    <div className="w-full h-full">
      <Canvas shadows gl={{ alpha: true }}>
        {/* Removed background color for transparency */}
        <color attach="background" args={["#f0f0f0"]} /> {/* Light background to see model better */}
        <ambientLight intensity={0.6} />
        <directionalLight 
          position={[10, 10, 5]} 
          intensity={1} 
          castShadow 
          shadow-mapSize-width={2048} 
          shadow-mapSize-height={2048}
          shadow-camera-far={50}
          shadow-camera-left={-10}
          shadow-camera-right={10}
          shadow-camera-top={10}
          shadow-camera-bottom={-10}
        />
        <directionalLight 
          position={[-5, 5, -5]} 
          intensity={0.5} 
        />
        <hemisphereLight 
          intensity={0.4} 
          groundColor="#8d8d8d"
          color="#ffffff"
        />
        <React.Suspense fallback={null}>
          <CottageModel />
          {/* Controlador de cámara personalizado para WASD */}
          <CameraController />
          <OrbitControls 
            makeDefault
            enableZoom={true}
            enablePan={false}  // Desactivamos pan del ratón porque usaremos WASD
            enableRotate={true}  // Mantenemos rotación con el ratón
            minPolarAngle={0}  // Sin restricción en rotación vertical
            maxPolarAngle={Math.PI}  // Permitir rotación vertical completa
            maxDistance={20}  // Permitir alejar bastante
            minDistance={0.5}  // Permitir acercarse para inspeccionar
            autoRotate={false}  // Sin rotación automática
            target={new THREE.Vector3(0, -0.1, 0)}  // Centro de órbita inicial
            data-orbit-controls  // Atributo para identificar fácilmente el elemento
          />
        </React.Suspense>
      </Canvas>
    </div>
  )
}
