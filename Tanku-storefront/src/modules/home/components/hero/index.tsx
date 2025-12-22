"use client"
import { useEffect, useRef } from "react"
import { 
  Scene, 
  Color, 
  PerspectiveCamera, 
  BoxGeometry, 
  MeshLambertMaterial, 
  WebGLRenderer,
  DirectionalLight,
  Mesh,
  Vector2,
  Vector3,
  Raycaster
} from "three"

const InteractiveCube: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<WebGLRenderer | null>(null)
  const cubeRef = useRef<Mesh | null>(null)
  const mousePosition = useRef<Vector2>(new Vector2())
  const targetRotation = useRef<Vector2>(new Vector2())
  const cameraPosition = useRef({ z: 5 })
  const targetZoom = useRef(5)
  const isDragging = useRef(false)
  const targetPosition = useRef(new Vector3(0, 0, 0))
  const raycaster = useRef(new Raycaster())

  useEffect(() => {
    if (!containerRef.current) return

    // Configuración de la escena
    const scene = new Scene()
    scene.background = new Color("#000000")

    // Configuración de la cámara
    const camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
    camera.position.z = cameraPosition.current.z

    // Configuración del renderer
    const renderer = new WebGLRenderer({ antialias: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    containerRef.current.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // Crear el cubo
    const geometry = new BoxGeometry(2, 2, 2)
    const material = new MeshLambertMaterial({ 
      color: "#468585",
      emissive: "#1a2f2f",
      emissiveIntensity: 0.2
    })
    const cube = new Mesh(geometry, material)
    scene.add(cube)
    cubeRef.current = cube

    // Añadir iluminación
    const light = new DirectionalLight("#ffffff", 1)
    light.position.set(5, 5, 5)
    scene.add(light)

    // Manejadores de eventos del mouse
    const onMouseMove = (event: MouseEvent) => {
      event.preventDefault()
      
      // Actualizar posición del mouse normalizada
      mousePosition.current.x = (event.clientX / window.innerWidth) * 2 - 1
      mousePosition.current.y = -(event.clientY / window.innerHeight) * 2 + 1

      if (isDragging.current && cubeRef.current) {
        // Actualizar posición del cubo mientras se arrastra
        raycaster.current.setFromCamera(mousePosition.current, camera)
        const intersectPlane = raycaster.current.ray.intersectPlane(
          // Plano paralelo a la cámara
          { normal: new Vector3(0, 0, 1), constant: 0 } as any,
          new Vector3()
        )
        if (intersectPlane) {
          targetPosition.current.copy(intersectPlane)
          // Limitar el movimiento
          targetPosition.current.x = Math.max(-5, Math.min(5, targetPosition.current.x))
          targetPosition.current.y = Math.max(-3, Math.min(3, targetPosition.current.y))
        }
      } else {
        // Rotación normal cuando no se está arrastrando
        targetRotation.current.x = mousePosition.current.y * 2
        targetRotation.current.y = mousePosition.current.x * 2
      }
    }

    const onMouseDown = (event: MouseEvent) => {
      event.preventDefault()
      raycaster.current.setFromCamera(mousePosition.current, camera)
      const intersects = raycaster.current.intersectObject(cube)
      if (intersects.length > 0) {
        isDragging.current = true
        document.body.style.cursor = 'grabbing'
      }
    }

    const onMouseUp = () => {
      isDragging.current = false
      document.body.style.cursor = 'default'
    }

    // Manejador del scroll
    const onScroll = (event: WheelEvent) => {
      event.preventDefault()
      const zoomSpeed = 0.001
      targetZoom.current = Math.max(2, Math.min(10, targetZoom.current + event.deltaY * zoomSpeed))
    }

    // Función de animación
    const animate = () => {
      requestAnimationFrame(animate)

      if (cubeRef.current) {
        if (!isDragging.current) {
          // Aplicar rotación solo cuando no se está arrastrando
          cubeRef.current.rotation.x += (targetRotation.current.x - cubeRef.current.rotation.x) * 0.05
          cubeRef.current.rotation.y += (targetRotation.current.y - cubeRef.current.rotation.y) * 0.05
        }
        
        // Suavizar el movimiento de arrastre
        cubeRef.current.position.x += (targetPosition.current.x - cubeRef.current.position.x) * 0.1
        cubeRef.current.position.y += (targetPosition.current.y - cubeRef.current.position.y) * 0.1
      }

      // Suavizar el zoom
      camera.position.z += (targetZoom.current - camera.position.z) * 0.05

      renderer.render(scene, camera)
    }

    // Iniciar animación
    animate()

    // Añadir event listeners
    window.addEventListener("mousemove", onMouseMove)
    window.addEventListener("mousedown", onMouseDown)
    window.addEventListener("mouseup", onMouseUp)
    containerRef.current.addEventListener("wheel", onScroll, { passive: false })

    // Manejar redimensionamiento de ventana
    const handleResize = () => {
      if (!rendererRef.current) return
      const width = window.innerWidth
      const height = window.innerHeight
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      rendererRef.current.setSize(width, height)
    }
    window.addEventListener("resize", handleResize)

    // Limpieza
    return () => {
      window.removeEventListener("mousemove", onMouseMove)
      window.removeEventListener("mousedown", onMouseDown)
      window.removeEventListener("mouseup", onMouseUp)
      window.removeEventListener("resize", handleResize)
      containerRef.current?.removeEventListener("wheel", onScroll)
      if (containerRef.current && rendererRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement)
      }
      document.body.style.cursor = 'default'
    }
  }, [])

  return (
    <div 
      ref={containerRef} 
      className="h-screen w-full" 
      style={{ 
        overflow: 'hidden',
        cursor: 'grab'
      }}
    >
    </div>
  )
}

export default InteractiveCube
