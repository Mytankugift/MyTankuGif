'use client'

import Link from 'next/link'

interface PromotionalBannerProps {
  variant: 1 | 2
}

export function PromotionalBanner({ variant }: PromotionalBannerProps) {
  if (variant === 1) {
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
        {/* Texto principal - a la izquierda, más pequeño */}
        <div
          style={{
            fontFamily: 'Montserrat, sans-serif',
            fontWeight: 'bold',
            fontStyle: 'normal',
            fontSize: '48px',
            lineHeight: '56px',
            letterSpacing: '0%',
            textAlign: 'left',
            verticalAlign: 'middle',
            background: 'linear-gradient(99.34deg, #73FFA2 24.37%, #459961 75.63%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            marginBottom: '40px',
            zIndex: 10,
            position: 'relative',
            paddingLeft: '20px',
          }}
        >
          UNA NUEVA FORMA DE DAR
        </div>

        {/* Rectángulos en horizontal con rotación -30 grados (inclinadas a la izquierda, conectadas como línea creciente) */}
        <div className="relative" style={{ height: '650px', width: '100%', maxWidth: '100%', zIndex: 5, padding: '40px 0', overflow: 'hidden', boxSizing: 'border-box' }}>
          {/* Rectángulo 1 - base, más abajo */}
          <div
            style={{
              width: '240px',
              height: '340px',
              padding: '20px',
              borderRadius: '25px',
              background: '#66DEDB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transform: 'rotate(-30deg)',
              transformOrigin: 'center center',
              position: 'absolute',
              left: 'calc(50% - 550px)',
              bottom: '80px',
            }}
          >
            <div className="text-center text-white font-bold" style={{ fontFamily: 'Poppins, sans-serif', fontSize: '14px', transform: 'rotate(30deg)' }}>
              Don't give a like
            </div>
          </div>

          {/* Rectángulo 2 - conectado con la punta inferior derecha de la primera */}
          <div
            style={{
              width: '240px',
              height: '340px',
              padding: '20px',
              borderRadius: '25px',
              background: '#010101',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transform: 'rotate(-30deg)',
              transformOrigin: 'center center',
              position: 'absolute',
              left: 'calc(50% - 280px)',
              bottom: '140px',
            }}
          >
            <div className="text-center text-white font-bold" style={{ fontFamily: 'Poppins, sans-serif', fontSize: '14px', transform: 'rotate(30deg)' }}>
              Give a TANKU
            </div>
          </div>

          {/* Rectángulo 3 - conectado con la punta inferior derecha de la segunda */}
          <div
            style={{
              width: '240px',
              height: '340px',
              padding: '20px',
              borderRadius: '25px',
              background: '#66DEDB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transform: 'rotate(-30deg)',
              transformOrigin: 'center center',
              position: 'absolute',
              left: 'calc(50% - 10px)',
              bottom: '200px',
            }}
          >
            <div className="text-center text-white font-bold" style={{ fontFamily: 'Poppins, sans-serif', fontSize: '14px', transform: 'rotate(30deg)' }}>
              Recibe sin pedir
            </div>
          </div>

          {/* Rectángulo 4 - conectado con la punta inferior derecha de la tercera */}
          <div
            style={{
              width: '240px',
              height: '340px',
              padding: '20px',
              borderRadius: '25px',
              background: '#73FFA2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transform: 'rotate(-30deg)',
              transformOrigin: 'center center',
              position: 'absolute',
              left: 'calc(50% + 260px)',
              bottom: '260px',
            }}
          >
            <div className="text-center text-black font-bold" style={{ fontFamily: 'Poppins, sans-serif', fontSize: '14px', transform: 'rotate(30deg)' }}>
              Regala con certeza
            </div>
          </div>
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
            className="inline-block bg-black text-white font-semibold rounded-full hover:bg-gray-800 transition-all duration-300 hover:transform hover:scale-105"
            style={{
              fontFamily: 'Poppins, sans-serif',
              padding: '12px 24px',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            Únete a Tanku
          </Link>
        </div>
      </div>
    )
  }

  // Variant 2
  return (
    <div
      className="w-full relative"
      style={{
        width: '100%',
        minHeight: '600px',
        position: 'relative',
        padding: '40px 20px',
        maxWidth: '100%',
        overflow: 'hidden',
      }}
    >
      {/* Texto principal - a la izquierda, más pequeño */}
      <div
        style={{
          fontFamily: 'Montserrat, sans-serif',
          fontWeight: 'bold',
          fontStyle: 'normal',
          fontSize: '48px',
          lineHeight: '56px',
          letterSpacing: '0%',
          textAlign: 'left',
          verticalAlign: 'middle',
          background: 'linear-gradient(99.34deg, #73FFA2 24.37%, #459961 75.63%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          marginBottom: '40px',
          zIndex: 10,
          position: 'relative',
          paddingLeft: '20px',
        }}
      >
        UNA NUEVA FORMA DE DAR
      </div>

      {/* Rectángulos en horizontal con rotación -30 grados (inclinadas a la izquierda, conectadas como línea creciente) */}
      <div className="relative" style={{ height: '650px', width: '100%', maxWidth: '100%', marginBottom: '20px', zIndex: 5, padding: '40px 0', overflow: 'hidden', boxSizing: 'border-box' }}>
        {/* Rectángulo 1 - base, más abajo */}
        <div
          style={{
            width: '240px',
            height: '340px',
            padding: '20px',
            borderRadius: '25px',
            background: '#FEF580',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: 'rotate(-30deg)',
            transformOrigin: 'center center',
            position: 'absolute',
            left: 'calc(50% - 550px)',
            bottom: '80px',
          }}
        >
          <div className="text-center text-black font-bold" style={{ fontFamily: 'Poppins, sans-serif', fontSize: '14px', transform: 'rotate(30deg)' }}>
            Don't give a like
          </div>
        </div>

        {/* Rectángulo 2 - conectado con la punta inferior derecha de la primera */}
        <div
          style={{
            width: '240px',
            height: '340px',
            padding: '20px',
            borderRadius: '25px',
            background: '#66DEDB',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: 'rotate(-30deg)',
            transformOrigin: 'center center',
            position: 'absolute',
            left: 'calc(50% - 280px)',
            bottom: '140px',
          }}
        >
          <div className="text-center text-white font-bold" style={{ fontFamily: 'Poppins, sans-serif', fontSize: '14px', transform: 'rotate(30deg)' }}>
            Give a TANKU
          </div>
        </div>

        {/* Rectángulo 3 - conectado con la punta inferior derecha de la segunda */}
        <div
          style={{
            width: '240px',
            height: '340px',
            padding: '20px',
            borderRadius: '25px',
            background: '#E73230B2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: 'rotate(-30deg)',
            transformOrigin: 'center center',
            position: 'absolute',
            left: 'calc(50% - 10px)',
            bottom: '200px',
          }}
        >
          <div className="text-center text-white font-bold" style={{ fontFamily: 'Poppins, sans-serif', fontSize: '14px', transform: 'rotate(30deg)' }}>
            Recibe sin pedir
          </div>
        </div>

        {/* Rectángulo 4 - conectado con la punta inferior derecha de la tercera */}
        <div
          style={{
            width: '240px',
            height: '340px',
            padding: '20px',
            borderRadius: '25px',
            background: '#66DEDB',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: 'rotate(-30deg)',
            transformOrigin: 'center center',
            position: 'absolute',
            left: 'calc(50% + 260px)',
            bottom: '260px',
          }}
        >
          <div className="text-center text-white font-bold" style={{ fontFamily: 'Poppins, sans-serif', fontSize: '14px', transform: 'rotate(30deg)' }}>
            Regala con certeza
          </div>
        </div>
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
          className="inline-block bg-black text-white font-semibold rounded-full hover:bg-gray-800 transition-all duration-300 hover:transform hover:scale-105"
          style={{
            fontFamily: 'Poppins, sans-serif',
            padding: '12px 24px',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          Únete a Tanku
        </Link>
      </div>
    </div>
  )
}
