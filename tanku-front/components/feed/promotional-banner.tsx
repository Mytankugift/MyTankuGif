'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface PromotionalBannerProps {
  variant: 1 | 2
}

// Configuración de cards para cada variante
// Solo definimos el desplazamiento horizontal (x), el vertical se calcula automáticamente
const CARD_CONFIGS = {
  1: [
    { 
      text: "Don't give a like", 
      bg: '#66DEDB', 
      textColor: 'text-white', 
      x: -3,
      fontSize: 70,
      lineHeight: 100,
      textBackground: 'linear-gradient(212.16deg, #3B9BC3 5.01%, #1C4A5D 94.99%)',
    },
    { 
      text: "Give a TANKU", 
      bg: '#010101', 
      textColor: 'text-white', 
      x: -0.8,
      fontSize: 62,
      lineHeight: 100,
      textBackground: 'linear-gradient(347.49deg, #73FFA2 37.85%, #459961 90.98%)',
    },
    { 
      text: "Recibe sin pedir", 
      bg: '#66DEDB', 
      textColor: 'text-white', 
      x: 1.4,
      fontSize: 61,
      lineHeight: 70,
      textBackground: 'linear-gradient(212.16deg, #3B9BC3 5.01%, #1C4A5D 94.99%)',
    },
    { 
      text: "Regala con certeza", 
      bg: '#73FFA2', 
      textColor: 'text-black', 
      x: 3.6,
      fontSize: 55,
      lineHeight: 75,
      textBackground: '#262626',
    },
  ],
  2: [
    { 
      text: "Primero Das", 
      bg: '#FEF580', 
      textColor: 'text-white', 
      x: -3,
      fontSize: 40,
      lineHeight: 80,
      textBackground: '#262626',
      specialText: {
        text: 'Das',
        fontSize: 70,
        lineHeight: 80,
      },
    },
    { 
      text: "Luego Conectas", 
      bg: '#66DEDB', 
      textColor: 'text-white', 
      x: -0.8,
      fontSize: 40,
      lineHeight: 80,
      textBackground: 'linear-gradient(180deg, #3B9BC3 0%, #1C4A5D 100%)',
    },
    { 
      text: "Aquí NO Compites", 
      bg: '#E73230B2', 
      textColor: 'text-white', 
      x: 1.4,
      fontSize: 48,
      lineHeight: 56,
      textBackground: 'linear-gradient(180deg, #FFFFFF 0%, #999999 100%)',
    },
    { 
      text: "Lo REAL pasa fuera", 
      bg: '#66DEDB', 
      textColor: 'text-black', 
      x: 3.6,
      fontSize: 52,
      lineHeight: 56,
      textBackground: 'linear-gradient(180deg, #3B9BC3 0%, #1C4A5D 100%)',
    },
  ],
}

// Ángulo de rotación constante para todas las cards
const ROTATION_ANGLE = -20

export function PromotionalBanner({ variant }: PromotionalBannerProps) {
  const cards = CARD_CONFIGS[variant]
  
  // Calcular la pendiente de la línea diagonal (tan(20°)) con multiplicador para exagerar la diagonal
  // Usamos valor absoluto del ángulo para el cálculo de la pendiente
  // Aumentamos el multiplicador para que las cards suban más y se alineen mejor
  const slope = Math.tan((Math.abs(ROTATION_ANGLE) * Math.PI) / 180)

  
  // Detectar si es móvil para escalar el layout
  const [isMobile, setIsMobile] = useState(false)
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])
  
  // Factor de escala para móvil (reduce tamaño y spacing)
  const scale = isMobile ? 0.5 : 1
  const DIAGONAL_STRENGTH = isMobile ? 120 : 100

  return (
    <div
      className="w-full relative"
      style={{
        width: '100%',
        minHeight: '650px',
        position: 'relative',
        padding: '40px 20px',
        maxWidth: '100%',
        overflow: 'hidden',
      }}
    >
      {/* Texto principal - a la izquierda, dividido en dos líneas */}
      <div
        style={{
          fontFamily: 'Montserrat, sans-serif',
          fontWeight: 'bold',
          fontStyle: 'bold',
          fontSize: isMobile ? '36px' : variant === 1 ? '70px' : '70px',
          lineHeight: isMobile ? '40px' : variant === 1 ? '80px' : '80px',
          letterSpacing: '0%',
          textAlign: 'left',
          verticalAlign: 'middle',
          marginBottom: isMobile ? '-60px' : '-60px',
          marginTop: isMobile ? '20px' : '40px',
          zIndex: 10,
          position: 'relative',
          paddingLeft: isMobile ? '10px' : '80px',
        }}
      >
        {variant === 1 ? (
          <>
            <div
              style={{
                background: 'linear-gradient(99.34deg, #73FFA2 24.37%, #459961 75.63%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              UNA NUEVA
            </div>
            <div
              style={{
                background: 'linear-gradient(99.34deg, #73FFA2 24.37%, #459961 75.63%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              FORMA DE DAR
            </div>
          </>
        ) : (
          <>
            <div
              style={{
                background: 'linear-gradient(95.76deg, #66DEDB 13.41%, #377876 86.59%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                display: 'block',
              }}
            >
              CONEXIONES
            </div>
            <div
              style={{
                background: 'linear-gradient(95.76deg, #66DEDB 13.41%, #377876 86.59%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                display: 'block',
              }}
            >
              REALES
            </div>
          </>
        )}
      </div>

      {/* Contenedor flex centrado para las cards - SIN flex-wrap para mantener las 4 cards visibles */}
      <div
        className="cards-container"
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '0', // Sin gap para mantener la alineación diagonal perfecta
          marginTop: isMobile ? '10px' : '60px',
          padding: isMobile ? '20px 10px' : '40px 20px',
          flexWrap: 'nowrap', // NO wrap - mantener las 4 cards siempre visibles
          position: 'relative',
          zIndex: 5,
          minHeight: '500px',
          overflow: 'visible', // Permitir que las cards rotadas se vean
        }}
      >
        {cards.map((card, index) => {
          // Calcular translateY automáticamente usando la pendiente
          // Para que las cards asciendan de izquierda a derecha:
          // Cuando x es negativo (izquierda) → translateY positivo (abajo)
          // Cuando x es positivo (derecha) → translateY negativo (arriba)
          const translateY = -card.x * slope * DIAGONAL_STRENGTH
          
          // Calcular los valores escalados para el transform
          const translateX = card.x * scale
          const translateYScaled = translateY * scale
          
          // Calcular el ángulo real de la diagonal basado en el desplazamiento
          // El ángulo real de la línea diagonal es: atan(translateY / translateX)
          // Para cada card, calculamos el ángulo basado en su posición específica
          // Si translateX es 0 o muy pequeño, usamos el ángulo de rotación directamente
          let realDiagonalAngle = ROTATION_ANGLE
          if (Math.abs(translateX) > 0.1) {
            realDiagonalAngle = Math.atan(translateYScaled / translateX) * (0 / Math.PI)
          }
          
          // El texto debe estar alineado con la orientación real de la diagonal
          // El texto está dentro de una card que ya está rotada ROTATION_ANGLE,
          // entonces necesitamos compensar esa rotación y aplicar el ángulo real
          const textAngle = realDiagonalAngle
          
          return (
            <div
              key={index}
              className="card"
              style={{
                // Tamaño responsive: más pequeño en móvil, normal en desktop
                width: isMobile ? '140px' : '220px',
                height: isMobile ? '200px' : '320px',
                borderRadius: '24px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                fontWeight: 'bold',
                textAlign: 'center',
                padding: isMobile ? '12px' : '20px',
                backgroundColor: card.bg,
                // Transform: primero translateX, luego translateY calculado, luego rotate
                transform: `translateX(${translateX}px) translateY(${translateYScaled}px) rotate(${ROTATION_ANGLE}deg)`,
                transformOrigin: 'center center',
                transition: 'transform 0.3s ease',
                cursor: 'pointer',
                flexShrink: 0, // No permitir que se encojan
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = `translateX(${translateX}px) translateY(${translateYScaled}px) rotate(${ROTATION_ANGLE}deg) scale(1.05)`
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = `translateX(${translateX}px) translateY(${translateYScaled}px) rotate(${ROTATION_ANGLE}deg)`
              }}
            >
              <div
                className={`text-center font-bold ${card.textColor}`}
                style={{
                  fontFamily: (variant === 1 || variant === 2) ? 'Montserrat, sans-serif' : 'Poppins, sans-serif',
                  fontWeight: (variant === 1 || variant === 2) ? 700 : 'bold',
                  fontStyle: (variant === 1 || variant === 2) ? 'bold' : 'normal',
                  fontSize: (variant === 1 || variant === 2) && 'fontSize' in card
                    ? isMobile 
                      ? variant === 2 && index === 2 // "Aquí NO Compites" - card 3 del variant 2
                        ? `${Math.round((card as any).fontSize * 0.6)}px`
                        : `${Math.round((card as any).fontSize * 0.7)}px`
                      : `${(card as any).fontSize || 14}px` 
                    : isMobile 
                    ? '10px' 
                    : '14px',
                  lineHeight: (variant === 1 || variant === 2) && 'lineHeight' in card
                    ? isMobile
                      ? `${Math.round((card as any).lineHeight * 0.7)}px`
                      : `${(card as any).lineHeight || 14}px` 
                    : 'normal',
                  letterSpacing: '0%',
                  textAlign: 'center',
                  verticalAlign: 'middle',
                  // Aplicar gradiente o color de fondo según la configuración
                  ...((variant === 1 || variant === 2) && 'textBackground' in card && (card as any).textBackground && (card as any).textBackground !== 'transparent'
                    ? ((card as any).textBackground.startsWith('linear-gradient')
                      ? {
                          background: (card as any).textBackground,
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          backgroundClip: 'text',
                        }
                      : {
                          color: (card as any).textBackground,
                        })
                    : {}),
                  // El texto debe estar alineado con la orientación real de la diagonal
                  transform: `rotate(${textAngle}deg)`,
                }}
              >
                {variant === 2 && index === 0 && 'specialText' in card ? (
                  <>
                    <span>Primero </span>
                    <span style={{
                      fontSize: !isMobile 
                        ? `${(card as any).specialText.fontSize}px` 
                        : `${Math.round((card as any).specialText.fontSize * 0.7)}px`,
                      lineHeight: !isMobile 
                        ? `${(card as any).specialText.lineHeight}px` 
                        : `${Math.round((card as any).specialText.lineHeight * 0.7)}px`,
                      color: (card as any).specialText.color,
                    }}>
                      {(card as any).specialText.text}
                    </span>
                  </>
                ) : (
                  card.text
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Botón Únete a Tanku - abajo a la derecha */}
      <div
        style={{
          position: 'absolute',
          bottom: '20px',
          right: '20px',
          zIndex: 20,
        }}
      >
        <Link
          href="/auth/login"
          className="inline-block font-semibold rounded-full transition-all duration-300 hover:transform hover:scale-105"
          style={{
            fontFamily: 'Poppins, sans-serif',
            padding: '12px 24px',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#73FFA2',
            color: '#000000',
            boxShadow: '0px 4px 4px 0px rgba(0, 0, 0, 0.25) inset',
          }}
        >
          Únete a TANKU
        </Link>
      </div>
    </div>
  )
}
