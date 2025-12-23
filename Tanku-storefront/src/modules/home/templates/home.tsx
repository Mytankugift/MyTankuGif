"use client"

import Image from "next/image"
import { useRouter } from "next/navigation"
import { useCallback } from "react"

const HomePage = () => {
  const router = useRouter()

  const handleJoinClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()
    router.push('/account')
  }, [router])

  return (
    <>
      <div className="h-full w-full bg-[#1E1E1E]  ">
        {/* Header with logo and button */}
        <div className="flex justify-between items-center p-3 sm:p-4 md:p-6 mx-4 sm:mx-8 md:mx-16 lg:mx-24">
          {/* Logo - top left */}
          <div className="flex items-center">
            <Image
              src="/logoTanku.png"
              alt="TANKU Logo"
              width={150}
              height={150}
              className="w-20 h-20 sm:w-28 sm:h-28 md:w-32 md:h-32 lg:w-40 lg:h-40 object-contain"
              priority
            />
          </div>

          {/* Buttons - top right */}
          <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
            <button
              onClick={handleJoinClick}
              className="text-center bg-gradient-to-r from-[#66DEDB] to-[#73FFA2] text-black font-semibold px-3 py-2 sm:px-4 sm:py-2 md:px-6 md:py-3 lg:px-8 lg:py-4 rounded-full hover:shadow-lg hover:shadow-[#66DEDB]/25 transition-all duration-300 hover:transform hover:scale-105 text-xs sm:text-sm md:text-base min-w-[120px] sm:min-w-[150px] md:min-w-[180px] lg:min-w-[200px] cursor-pointer"
            >
              Únete a Tanku
            </button>
          </div>
        </div>

        {/* Main content - centered */}
        <div className="flex flex-col items-center min-h-[calc(100vh-120px)] text-center    my-6 sm:my-8 md:my-10">
          {/* Main title with gradient */}
          <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-8xl font-bold mb-4 sm:mb-5 md:mb-6">
            <span className="bg-gradient-to-r from-[#4CAF50] to-[#73FFA2] bg-clip-text text-transparent">
              We're TANKU
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg sm:text-xl md:text-2xl lg:text-5xl text-[#66DEDB] font-medium mb-16 sm:mb-20 md:mb-24 lg:mb-32">
            We Create Good <br /> Emotions ❤
          </p>

          {/* Sliding text animation */}
          <div className="w-full overflow-hidden">
            <div className="flex items-center whitespace-nowrap animate-slide-left">
              <span className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-semibold text-[#66DEDB] mx-4 sm:mx-6 md:mx-8">
                Regala TANKU
              </span>
              <div className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 bg-[#3B9BC3] rounded-full mx-4 sm:mx-6 md:mx-8 flex-shrink-0"></div>
              <span className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-semibold text-[#66DEDB] mx-4 sm:mx-6 md:mx-8">
                Recibe TANKU
              </span>
              <div className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 bg-[#3B9BC3] rounded-full mx-4 sm:mx-6 md:mx-8 flex-shrink-0"></div>
              <span className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-semibold text-[#66DEDB] mx-4 sm:mx-6 md:mx-8">
                Reune TANKU
              </span>
              <div className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 bg-[#3B9BC3] rounded-full mx-4 sm:mx-6 md:mx-8 flex-shrink-0"></div>
              <span className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-semibold text-[#66DEDB] mx-4 sm:mx-6 md:mx-8">
                Comparte TANKU
              </span>
              <div className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 bg-[#306073] rounded-full mx-4 sm:mx-6 md:mx-8 flex-shrink-0"></div>
              <span className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-semibold text-[#66DEDB] mx-4 sm:mx-6 md:mx-8">
                Conecta TANKU
              </span>
              <div className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 bg-[#3B9BC3] rounded-full mx-4 sm:mx-6 md:mx-8 flex-shrink-0"></div>
              <span className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-semibold text-[#66DEDB] mx-4 sm:mx-6 md:mx-8">
                Descubre TANKU
              </span>
              <div className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 bg-[#3B9BC3] rounded-full mx-4 sm:mx-6 md:mx-8 flex-shrink-0"></div>
              <span className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-semibold text-[#66DEDB] mx-4 sm:mx-6 md:mx-8">
                Vive TANKU
              </span>
              <div className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 bg-[#3B9BC3] rounded-full mx-4 sm:mx-6 md:mx-8 flex-shrink-0"></div>
              <span className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-semibold text-[#66DEDB] mx-4 sm:mx-6 md:mx-8">
                Disfruta TANKU
              </span>
              <div className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 bg-[#3B9BC3] rounded-full mx-4 sm:mx-6 md:mx-8 flex-shrink-0"></div>
              {/* Duplicate content for seamless loop */}
              <span className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-semibold text-[#66DEDB] mx-4 sm:mx-6 md:mx-8">
                Regala TANKU
              </span>
              <div className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 bg-[#3B9BC3] rounded-full mx-4 sm:mx-6 md:mx-8 flex-shrink-0"></div>
              <span className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-semibold text-[#66DEDB] mx-4 sm:mx-6 md:mx-8">
                Recibe TANKU
              </span>
              <div className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 bg-[#3B9BC3] rounded-full mx-4 sm:mx-6 md:mx-8 flex-shrink-0"></div>
              <span className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-semibold text-[#66DEDB] mx-4 sm:mx-6 md:mx-8">
                Reune TANKU
              </span>
              <div className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 bg-[#3B9BC3] rounded-full mx-4 sm:mx-6 md:mx-8 flex-shrink-0"></div>
              <span className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-semibold text-[#66DEDB] mx-4 sm:mx-6 md:mx-8">
                Comparte TANKU
              </span>
              <div className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 bg-[#3B9BC3] rounded-full mx-4 sm:mx-6 md:mx-8 flex-shrink-0"></div>
              <span className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-semibold text-[#66DEDB] mx-4 sm:mx-6 md:mx-8">
                Conecta TANKU
              </span>
              <div className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 bg-[#3B9BC3] rounded-full mx-4 sm:mx-6 md:mx-8 flex-shrink-0"></div>
              <span className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-semibold text-[#66DEDB] mx-4 sm:mx-6 md:mx-8">
                Descubre TANKU
              </span>
              <div className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 bg-[#3B9BC3] rounded-full mx-4 sm:mx-6 md:mx-8 flex-shrink-0"></div>
              <span className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-semibold text-[#66DEDB] mx-4 sm:mx-6 md:mx-8">
                Vive TANKU
              </span>
              <div className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 bg-[#3B9BC3] rounded-full mx-4 sm:mx-6 md:mx-8 flex-shrink-0"></div>
              <span className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-semibold text-[#66DEDB] mx-4 sm:mx-6 md:mx-8">
                Disfruta TANKU
              </span>
            </div>
          </div>

          {/* Quienes Somos section */}
          <div className="w-full mt-16 sm:mt-20 md:mt-24 lg:mt-32 px-3 sm:px-4 md:px-6 lg:px-24 flex flex-col md:flex-row items-start justify-between">
            {/* Left-aligned title with same gradient as main title */}
            <div className="w-full md:w-1/3">
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-8xl font-bold text-left mb-4 sm:mb-5 md:mb-0">
                <span className="bg-gradient-to-r from-[#4CAF50] to-[#73FFA2] bg-clip-text text-transparent">
                  Quienes Somos
                </span>
              </h2>
            </div>

            {/* Right-aligned description text */}
            <div className="w-full md:w-2/3 mt-2 sm:mt-3 md:mt-0">
              <p className="text-white text-lg sm:text-xl md:text-2xl lg:text-4xl xl:text-6xl font-light text-left md:text-right leading-relaxed">
                Bienvenido al primer GivE-Commerce del mundo: donde la gratitud
                y admiración transforman la forma de comprar.
              </p>
            </div>
          </div>

          {/* Image showcase section */}
          <div className="w-full mt-20 sm:mt-24 md:mt-32 lg:mt-40  sm:px-4 md:px-6 md:pt-12 lg:pt-24 flex flex-col items-center relative">
            {/* Circular gradient background */}
            <div className="absolute inset-0 overflow-hidden z-0">
              <div className="w-full h-full bg-[#1E1E1E] relative">
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] sm:w-[1000px] md:w-[1200px] h-[800px] sm:h-[1000px] md:h-[1200px] rounded-full radial-gradient-circle opacity-40"></div>
              </div>
            </div>
            {/* Introductory phrase */}
            <div className="flex flex-col items-center w-full relative z-10">
              <p className="text-xl sm:text-2xl md:text-3xl lg:text-5xl text-[#66DEDB] font-bold text-center mb-16 sm:mb-20 md:mb-24 lg:mb-32">
                CONECTA CON LO QUE <br/>TE HACE FELIZ
              </p>

              {/* Images container - positioned directly below the text */}
              <div className="w-full flex flex-row items-start justify-between mt-2 sm:mt-3 md:mt-4 gap-4">
                {/* Left side images with left tilt */}
                <div className="w-1/2 md:w-2/5 relative h-[200px] sm:h-[250px] md:h-[350px] lg:h-[400px] xl:h-[450px]">
                  <div className="relative h-full">
                    {/* Back image */}
                    <div className="absolute transform -rotate-5 left-1 sm:left-2 md:left-4 lg:left-8 xl:left-16 top-1 sm:top-2 md:top-3 lg:top-4 z-10">
                      <Image
                        src="/landing/Home_gorro.png"
                        alt="Gorro naranja"
                        width={350}
                        height={350}
                        className="rounded-2xl w-[100px] sm:w-[140px] md:w-[180px] lg:w-[220px] xl:w-[300px]"
                      />
                    </div>
                    {/* Front image */}
                    <div className="absolute transform -rotate-5 left-12 sm:left-16 md:left-20 lg:left-28 xl:left-52 top-0 sm:-top-5 md:-top-10 lg:-top-15 xl:-top-20">
                      <Image
                        src="/landing/Almoada.png"
                        alt="Almohada con rayas"
                        width={300}
                        height={300}
                        className="rounded-2xl w-[80px] sm:w-[110px] md:w-[150px] lg:w-[180px] xl:w-[250px]"
                      />
                    </div>
                  </div>
                </div>

                {/* Center arrow */}
                <div className="absolute left-1/2 transform -translate-x-1/2 z-20 w-16 sm:w-20 md:w-24 lg:w-32 xl:w-48 mt-12 sm:mt-14 md:mt-16 lg:mt-20 xl:mt-1">
                  <Image
                    src="/landing/Flecha_Derecha_Curva.png"
                    alt="Flecha curva"
                    width={300}
                    height={100}
                    className="w-full"
                  />
                </div>

                {/* Right side images with right tilt */}
                <div className="w-1/2 md:w-2/5 relative h-[200px] sm:h-[250px] md:h-[350px] lg:h-[400px] xl:h-[450px]">
                  <div className="relative h-full">
                    {/* Back image */}
                    <div className="absolute transform -rotate-5 left-1 sm:left-2 md:left-4 lg:left-8 xl:left-16 top-0 sm:-top-5 md:-top-10 lg:-top-15 xl:-top-20">
                      <Image
                        src="/landing/almoadas_persona.png"
                        alt="Persona con almohadas"
                        width={300}
                        height={300}
                        className="rounded-2xl w-[80px] sm:w-[110px] md:w-[150px] lg:w-[180px] xl:w-[250px]"
                      />
                    </div>
                    {/* Front image */}
                    <div className="absolute transform -rotate-5 left-12 sm:left-16 md:left-20 lg:left-28 xl:left-52 top-1 sm:top-2 md:top-3 lg:top-4 z-10">
                      <Image
                        src="/landing/Hombre_gorro.png"
                        alt="Hombre con gorro"
                        width={350}
                        height={350}
                        className="rounded-2xl w-[100px] sm:w-[140px] md:w-[180px] lg:w-[220px] xl:w-[300px]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Second phase */}
              <div className="-m-6 sm:-m-8 md:-m-10">
                <p className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl text-[#73FFA2] font-bold text-center">
                  Descubre el verdadero significado del <br /> Agradecimiento
                </p>
              </div>

              {/* Second row of images - AR showcase with overlapping effect */}
              <div className="w-full flex flex-col items-center mt-12 sm:mt-16 md:mt-20 relative z-10">
                <div
                  className="relative flex justify-center w-full px-2 sm:px-3 md:px-0"
                  style={{ height: "auto", minHeight: "150px" }}
                >
                  {/* Center container for all images in a single row */}
                  <div className="relative flex flex-nowrap justify-center items-center gap-2 sm:gap-3 md:gap-4 w-full max-w-[800px] sm:max-w-[1000px] md:max-w-[1200px]">
                    {/* Product03 image */}
                    <div className="hover:scale-105 transition-all duration-300 rounded-2xl overflow-hidden flex-shrink-0 z-10">
                      <Image
                        src="/landing/Product03.png"
                        alt="Product"
                        width={250}
                        height={250}
                        style={{ objectFit: "contain" }}
                        className="w-[120px] sm:w-[150px] md:w-[200px] lg:w-[250px]"
                      />
                    </div>

                    {/* AR Experience image */}
                    <div className="hover:scale-105 transition-all duration-300 rounded-2xl flex-shrink-0 -ml-8 sm:-ml-12 md:-ml-16 lg:-ml-20 z-20">
                      <Image
                        src="/landing/RA.png"
                        alt="AR Experience"
                        width={250}
                        height={250}
                        style={{ objectFit: "contain" }}
                        className="w-[120px] sm:w-[150px] md:w-[200px] lg:w-[250px]"
                      />
                    </div>

                    {/* Product05 image */}
                    <div className="hover:scale-105 transition-all duration-300 rounded-2xl overflow-hidden flex-shrink-0 z-30 -ml-8 sm:-ml-12 md:-ml-16 lg:-ml-20">
                      <Image
                        src="/landing/Product05.png"
                        alt="Product"
                        width={250}
                        height={250}
                        style={{ objectFit: "contain" }}
                        className="rounded-2xl w-[120px] sm:w-[150px] md:w-[200px] lg:w-[250px]"
                      />
                    </div>

                    {/* AR Animation image */}
                    <div className="hover:scale-105 transition-all duration-300 rounded-2xl overflow-hidden flex-shrink-0 z-40 -ml-8 sm:-ml-12 md:-ml-16 lg:-ml-20">
                      <Image
                        src="/landing/Animacón RA 1.png"
                        alt="AR Animation"
                        width={250}
                        height={250}
                        style={{ objectFit: "contain" }}
                        className="rounded-2xl w-[120px] sm:w-[150px] md:w-[200px] lg:w-[250px]"
                      />
                    </div>
                  </div>
                </div>

                {/* Caption and arrow */}
                <div className="flex flex-col md:flex-row items-center justify-center mt-8 sm:mt-10 md:mt-8 w-full -ml-24">
                  <div className="flex flex-col sm:flex-row items-center">
                    <Image
                      src="/landing/Vector 3.png"
                      alt="Arrow"
                      width={100}
                      height={50}
                      className="w-16 sm:w-18 md:w-20 lg:w-24 transform -rotate mt-2"
                    />
                    <div className="ml-0 sm:ml-4 md:ml-6 lg:ml-10 lg:mt-40 mt-4 sm:mt-0 text-center sm:text-left">
                      <h3 className="text-lg sm:text-xl md:text-2xl lg:text-3xl text-center text-[#73FFA2] font-bold">
                        Hacemos magia gracias a la RA
                      </h3>
                      <p className="text-sm sm:text-base md:text-2xl lg:text-2xl text-center text-white mt-1 sm:mt-2">
                        Recreamos la compra y entrega de un producto en segundos
                      </p>
                    </div>
                  </div>
                </div>

                {/* Seccion 3 imagenes */}
              <div className="w-full flex  justify-center  gap-4 my-12">
                <Image
                  src="/landing/foto1.png"
                  alt="Comunidad Tanku"
                  width={250}
                        height={250}
                        style={{ objectFit: "contain" }}
                        className="rounded-2xl w-[120px] sm:w-[150px] md:w-[200px] lg:w-[250px] mt-20"
                />
                 <Image
                src="/landing/foto2.png"
                alt="Comunidad Tanku"
                width={250}
                        height={250}
                        style={{ objectFit: "contain" }}
                        className="rounded-2xl w-[120px] sm:w-[100px] md:w-[150px] lg:w-[200px] "
              />
           
            <Image
                src="/landing/foto3.png"
                alt="Comunidad Tanku"
                width={250}
                height={250}
                style={{ objectFit: "contain" }}
                className="rounded-2xl w-[120px] sm:w-[150px] md:w-[200px] lg:w-[250px] mt-20"
              />
                
              </div>
                </div>
            </div>
          </div>
          <div className={"w-full text-2xl text-white text-center mb-20"}>
            <div className=" my-10">
            <p>Sé de los primeros en experimentar la gratitud 
            a través del GivE-Commerce.</p>
            <p>¡Regístrate ahora y gana hasta <span className="text-[#73FFA2]">$100.000 COP</span> 
            para tu primer <span className="text-[#73FFA2]">TANKU</span>!</p>
            </div>
            <button
              onClick={handleJoinClick}
              className="text-center bg-[#73FFA2] text-black font-semibold px-4 py-2 sm:px-6 sm:py-3 md:px-8 md:py-4 rounded-full hover:shadow-lg hover:shadow-[#66DEDB]/25 transition-all duration-300 hover:transform hover:scale-105 text-sm sm:text-base md:text-lg min-w-[150px] sm:min-w-[180px] md:min-w-[200px] z-50 mb-12 sm:mb-16 md:mb-20 cursor-pointer"
            >
              Descubre el Poder de Tanku
            </button>
          </div>

          <div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-normal text-left mb-4 sm:mb-5 md:mb-0">
                <span className="bg-gradient-to-r from-[#4CAF50] to-[#73FFA2] bg-clip-text text-transparent">
                  Productos destacados
                </span>
              </h2>
            </div>

            {/*Seccion de productos destacados */}
          {/* Carousel sliding left */}
          <div className="w-full my-12 overflow-hidden">
            <div className="flex items-center gap-8 animate-slide-left-carousel">
              {/* First set of images */}
              {[
                "/landing/2.png",
                "/landing/3.png",
                "/landing/4.png",
                "/landing/p1.png",
                "/landing/slider5.png"
              ].map((src, index) => (
                <div key={`left-${index}`} className="flex-shrink-0">
                  <div className="relative w-96 h-64 rounded-lg overflow-hidden hover:scale-105 transition-all duration-300">
                    <Image
                      src={src}
                      alt={`Product ${index + 1}`}
                      fill
                      style={{ objectFit: "cover" }}
                      className="rounded-lg"
                    />
                  </div>
                </div>
              ))}
              {/* Second set of images */}
              {[
                "/landing/2.png",
                "/landing/3.png",
                "/landing/4.png",
                "/landing/p1.png",
                "/landing/slider5.png"
              ].map((src, index) => (
                <div key={`left-dup-${index}`} className="flex-shrink-0">
                  <div className="relative w-96 h-64 rounded-lg overflow-hidden hover:scale-105 transition-all duration-300">
                    <Image
                      src={src}
                      alt={`Product ${index + 1}`}
                      fill
                      style={{ objectFit: "cover" }}
                      className="rounded-lg"
                    />
                  </div>
                </div>
              ))}
              {/* Third set of images for seamless looping */}
              {[
                "/landing/2.png",
                "/landing/3.png",
                "/landing/4.png",
                "/landing/p1.png",
                "/landing/slider5.png"
              ].map((src, index) => (
                <div key={`left-trip-${index}`} className="flex-shrink-0">
                  <div className="relative w-96 h-64 rounded-lg overflow-hidden hover:scale-105 transition-all duration-300">
                    <Image
                      src={src}
                      alt={`Product ${index + 1}`}
                      fill
                      style={{ objectFit: "cover" }}
                      className="rounded-lg"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          
          
          {/* Carousel sliding right */}
          <div className="w-full my-12 overflow-hidden">
            <div className="flex items-center gap-8 animate-slide-right-carousel">
              {/* First set of images */}
              {[
                "/landing/2.png",
                "/landing/3.png",
                "/landing/4.png",
                "/landing/p1.png",
                "/landing/slider5.png"
              ].map((src, index) => (
                <div key={`right-${index}`} className="flex-shrink-0">
                  <div className="relative w-96 h-64 rounded-lg overflow-hidden hover:scale-105 transition-all duration-300">
                    <Image
                      src={src}
                      alt={`Product ${index + 1}`}
                      fill
                      style={{ objectFit: "cover" }}
                      className="rounded-lg"
                    />
                  </div>
                </div>
              ))}
              {/* Second set of images */}
              {[
                "/landing/2.png",
                "/landing/3.png",
                "/landing/4.png",
                "/landing/p1.png",
                "/landing/slider5.png"
              ].map((src, index) => (
                <div key={`right-dup-${index}`} className="flex-shrink-0">
                  <div className="relative w-96 h-64 rounded-lg overflow-hidden hover:scale-105 transition-all duration-300">
                    <Image
                      src={src}
                      alt={`Product ${index + 1}`}
                      fill
                      style={{ objectFit: "cover" }}
                      className="rounded-lg"
                    />
                  </div>
                </div>
              ))}
              {/* Third set of images for seamless looping */}
              {[
                "/landing/2.png",
                "/landing/3.png",
                "/landing/4.png",
                "/landing/p1.png",
                "/landing/slider5.png"
              ].map((src, index) => (
                <div key={`right-trip-${index}`} className="flex-shrink-0">
                  <div className="relative w-96 h-64 rounded-lg overflow-hidden hover:scale-105 transition-all duration-300">
                    <Image
                      src={src}
                      alt={`Product ${index + 1}`}
                      fill
                      style={{ objectFit: "cover" }}
                      className="rounded-lg"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sliding text animation */}
          <div className="w-full overflow-hidden mt-20">
            <div className="flex items-center whitespace-nowrap animate-slide-left-carousel">
              <span className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-semibold text-[#73FFA2] mx-4 sm:mx-6 md:mx-8">
              Conoce con Tanku
              </span>
              <div className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 bg-[#FEF580] rounded-full mx-4 sm:mx-6 md:mx-8 flex-shrink-0"></div>
              <span className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-semibold text-[#73FFA2] mx-4 sm:mx-6 md:mx-8">
              Construye con Tanku
              </span>
              <div className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 bg-[#FEF580] rounded-full mx-4 sm:mx-6 md:mx-8 flex-shrink-0"></div>
              <span className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-semibold text-[#73FFA2] mx-4 sm:mx-6 md:mx-8">
              Comparte TANKU
              </span>
              <div className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 bg-[#FEF580] rounded-full mx-4 sm:mx-6 md:mx-8 flex-shrink-0"></div>
              <span className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-semibold text-[#73FFA2] mx-4 sm:mx-6 md:mx-8">
              Conoce con Tanku
              </span>
              <div className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 bg-[#FEF580] rounded-full mx-4 sm:mx-6 md:mx-8 flex-shrink-0"></div>
              <span className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-semibold text-[#73FFA2] mx-4 sm:mx-6 md:mx-8">
              Construye con Tanku
              </span>
              <div className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 bg-[#FEF580] rounded-full mx-4 sm:mx-6 md:mx-8 flex-shrink-0"></div>
              <span className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-semibold text-[#73FFA2] mx-4 sm:mx-6 md:mx-8">
              Comparte TANKU
              </span>
              <div className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 bg-[#FEF580] rounded-full mx-4 sm:mx-6 md:mx-8 flex-shrink-0"></div>
              <span className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-semibold text-[#73FFA2] mx-4 sm:mx-6 md:mx-8">
              Conoce con Tanku
              </span>
              <div className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 bg-[# FEF580] rounded-full mx-4 sm:mx-6 md:mx-8 flex-shrink-0"></div>
              <span className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-semibold text-[#73FFA2] mx-4 sm:mx-6 md:mx-8">
              Construye con Tanku
              </span>
              <div className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 bg-[#FEF580] rounded-full mx-4 sm:mx-6 md:mx-8 flex-shrink-0"></div>
              {/* Duplicate content for seamless loop */}
              <span className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-semibold text-[#73FFA2] mx-4 sm:mx-6 md:mx-8">
              Comparte TANKU
              </span>
              <div className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 bg-[#FEF580] rounded-full mx-4 sm:mx-6 md:mx-8 flex-shrink-0"></div>
              <span className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-semibold text-[#73FFA2] mx-4 sm:mx-6 md:mx-8">
              Construye con Tanku
              </span>
              <div className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 bg-[#FEF580] rounded-full mx-4 sm:mx-6 md:mx-8 flex-shrink-0"></div>
              <span className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-semibold text-[#73FFA2] mx-4 sm:mx-6 md:mx-8">
              Comparte TANKU
              </span>
              <div className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 bg-[#FEF580] rounded-full mx-4 sm:mx-6 md:mx-8 flex-shrink-0"></div>
              <span className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-semibold text-[#73FFA2] mx-4 sm:mx-6 md:mx-8">
              Construye con Tanku
              </span>
              <div className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 bg-[#FEF580] rounded-full mx-4 sm:mx-6 md:mx-8 flex-shrink-0"></div>
              <span className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-semibold text-[#73FFA2] mx-4 sm:mx-6 md:mx-8">
                Conecta TANKU
              </span>
              <div className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 bg-[#FEF580] rounded-full mx-4 sm:mx-6 md:mx-8 flex-shrink-0"></div>
              <span className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-semibold text-[#73FFA2] mx-4 sm:mx-6 md:mx-8">
                Descubre TANKU
              </span>
              <div className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 bg-[#FEF580] rounded-full mx-4 sm:mx-6 md:mx-8 flex-shrink-0"></div>
              <span className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-semibold text-[#73FFA2] mx-4 sm:mx-6 md:mx-8">
                Vive TANKU
              </span> 
              <div className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 bg-[#FEF580] rounded-full mx-4 sm:mx-6 md:mx-8 flex-shrink-0"></div>
              <span className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-semibold text-[#73FFA2] mx-4 sm:mx-6 md:mx-8">
                Disfruta TANKU
              </span>
            </div>
          </div>
          
          {/* Nueva sección con Group 402.png */}
          <div 
            className="w-full flex flex-col items-center -my-12 sm:-my-16 md:-my-20 relative z-10 py-16"
            style={{
              background: 'radial-gradient(circle at center 60%, rgba(115, 255, 162, 0.6) 0%, rgba(115, 255, 162, 0.3) 25%, rgba(115, 255, 162, 0) 50%)'
            }}
          >
            <div className="relative w-full max-w-[800px] sm:max-w-[1000px] md:max-w-[1200px] flex justify-center px-4 sm:px-6 md:px-0">
              <Image
                src="/landing/Group 402.png"
                alt="Comunidad Tanku"
                width={1200}
                height={800}
                priority
                style={{ width: "100%", height: "auto", maxWidth: "100%" }}
                className="w-full h-auto -mt-20"
              />
            </div>
           

            <div  className="-mt-30 sm:-mt-38 md:-mt-40 lg:-mt-52 mb-20">
            <div className="relative w-24 h-24 md:w-36 md:h-36 mx-auto transform  -mt-40 mb-20">
              <Image
                src="/landing/Heart.png"
                alt="Animación Give 3"
                fill
                style={{ objectFit: "contain" }}
              />
            </div>
            {/* titulo con tres gif*/}
            <div className="w-full max-w-[1200px] flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 px-4   ">
              {/* GIF izquierdo */}
              

              <div className="relative w-32 h-32 md:w-48 md:h-48 flex-shrink-0 transform -rotate-12">
                <Image
                  src="/landing/Animación Give01.gif"
                  alt="Animación Give 1"
                  className="rounded-3xl"
                  fill
                  style={{ objectFit: "contain" }}
                />
              </div>
              
              {/* Título central */}
              <div className="text-start flex flex-col mb-20">
                <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold text-[#333333]">Descubre</h2>
                <p className="text-lg md:text-xl lg:text-2xl text-[#333333] my-1 md:my-2">el verdadero significado del</p>
                <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold text-[#333333]">Agradecimiento</h2>
              </div>
              
              {/* GIF derecho */}
              <div className="relative w-32 h-32 md:w-48 md:h-48 flex-shrink-0 transform rotate-12">
                <Image
                  src="/landing/Animación Give02.gif"
                  alt="Animación Give 2"
                  className="rounded-3xl"
                  fill
                  style={{ objectFit: "contain" }}
                />
              </div>
              
            </div>
             {/* GIF inferior */}
             <div className="relative w-32 h-32 md:w-48 md:h-48 mx-auto transform -rotate-6 -mt-4 mb-32">
              <Image
                src="/landing/Animación Give03.gif"
                alt="Animación Give 3"
                className="rounded-3xl"
                fill
                style={{ objectFit: "contain" }}
              />
            </div>
           
            <div className="flex flex-col items-center text-center z-50  mb-4 sm:mb-5 md:mb-6 px-3 sm:px-4 md:px-6">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-7xl font-bold bg-gradient-to-r from-[#3A7A7A] to-[#66DEDB] inline-block text-transparent bg-clip-text mb-4 sm:mb-5 md:mb-6">
              DON'T GIVE A LIKE,<br />GIVE A TANKU
            </h1>
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl text-white font-medium mb-6 sm:mb-8 md:mb-10">
              Haz crecer tu red de <br /> Admiración y Gratitud
            </p>
          </div>

          <button
            onClick={handleJoinClick}
            className="text-center bg-[#73FFA2] text-black font-semibold px-4 py-2 sm:px-6 sm:py-3 md:px-8 md:py-4 rounded-full hover:shadow-lg hover:shadow-[#66DEDB]/25 transition-all duration-300 hover:transform hover:scale-105 text-sm sm:text-base md:text-lg min-w-[150px] sm:min-w-[180px] md:min-w-[200px] z-50 mb-12 sm:mb-16 md:mb-20 cursor-pointer"
          >
            ¡Inicia Ya!
          </button>
          </div>

          </div>
          <div className="w-full h-16 bg-[#1e1e1e] flex justify-around">
          <div className="w-full h-16 bg-[#1e1e1e] "> <Image
              src="/logoTanku.png"
              alt="TANKU Logo"
              width={50}
              height={50}
              className="w-10 h-10 sm:w-16 sm:h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 "
              priority
            /></div>
          <div className="w-full h-16 bg-[#1e1e1e] text-white">
           <p>Terminos y Condiciones</p> 
           <p>Políticas de Privacidad</p> 
           <p>Políticas de Compra</p> 
          </div>
          <div className="w-full h-16 bg-[#1e1e1e] text-white">
           <p>Contacto</p> 
           <p>Vende</p> 
           <p>Ayuda</p> 
          </div>
          <div className="w-full h-16 bg-[#1e1e1e] text-white">
           <p>Español</p> 
           <p>English</p> 
           <p>Français</p> 
          </div>
          <div className="w-full h-16 bg-[#1e1e1e] flex justify-center gap-5 items-center">
            <Image
              src="/icon_social/Facebook_Green.png"
              alt="TANKU Logo"
              width={40}
              height={50}
              className="w-3 h-5 "
            />
            <Image
              src="/icon_social/Instagram_Green.png"
              alt="TANKU Logo"
              width={50}
              height={50}
              className="w-5 h-5 "
             
            />
            <Image
              src="/icon_social/Tiktok_Green.png"
              alt="TANKU Logo"
              width={50}
              height={50}
              className="w-5 h-5 "
              
            />
            <Image
              src="/icon_social/Youtube_Green.png"
              alt="TANKU Logo"
              width={50}
              height={50}
              className="w-5 h-5 "
            
            />
            
          </div>
        </div>
        </div>
      
      </div>

      <style jsx>{`
        @keyframes slide-left {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        
        @keyframes slide-left-carousel {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        
        @keyframes slide-right-carousel {
          0% {
            transform: translateX(-50%);
          }
          100% {
            transform: translateX(0);
          }
        }

        .animate-slide-left {
          animation: slide-left 30s linear infinite;
        }
        
        .animate-slide-left-carousel {
          animation: slide-left-carousel 40s linear infinite;
        }
        
        .animate-slide-right-carousel {
          animation: slide-right-carousel 40s linear infinite;
        }

        .radial-gradient-circle {
          background: radial-gradient(
            circle at center,
            #66DEDB 0%,
            #51BDCF 44%,
            #3B9BC3 69%,
            rgba(48, 96, 115, 0.7) 85%,
            rgba(38, 38, 38, 0.3) 95%,
            transparent 100%
          );
          width: 150%;
          left: -25%;
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          height: 100%;
          border-radius: 50%;
        }
      `}</style>
    </>
  )
}

export default HomePage
