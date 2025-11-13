"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"

// Categorías (mismo que en feed.tsx)
const mockCategories = [
  {
    id: 1,
    name: "CELEBRACIONES",
    image: "/categories/Celebraciones2.png",
    color: "border-yellow-400",
    url: "/celebraciones",
  },
  {
    id: 16,
    name: "VEHICULOS",
    image: "/categories/Vehiculos.gif",
    color: "border-blue-400",
    url: "/vehiculos",
  },
  {
    id: 2,
    name: "DEPORTES Y HOBBIES",
    image: "/categories/Deportes_y_Hobbies.png",
    color: "border-blue-400",
    url: "/deportes-y-hobbies",
  },
  {
    id: 15,
    name: "OFICINA Y ESCOLAR",
    image: "/categories/Oficina-Y-Escolar.gif",
    color: "border-blue-400",
    url: "/oficina-y-escolar",
  },
  {
    id: 3,
    name: "JUGUETERÍA",
    image: "/categories/Jugueteria2.png",
    color: "border-red-400",
    url: "/jugueteria",
  },
  {
    id: 14,
    name: "JOYAS Y RELOJES",
    image: "/categories/Joyas-Y-Relojes.gif",
    color: "border-blue-400",
    url: "/joyeria",
  },
  {
    id: 4,
    name: "LIBROS Y MÚSICA",
    image: "/categories/Libros_y_Musica.png",
    color: "border-green-400",
    url: "/libros-y-musica",
  },
  {
    id: 13,
    name: "EXPERIENCIAS",
    image: "/categories/Experiencias.gif",
    color: "border-blue-400",
    url: "/experiencias",
  },
  {
    id: 5,
    name: "MASCOTAS",
    image: "/categories/Mascotas2.png",
    color: "border-purple-400",
    url: "/mascotas",
  },
  {
    id: 6,
    name: "MODA HOMBRES",
    image: "/categories/Moda_Hombres.png",
    color: "border-pink-400",
    url: "/hombres",
  },
  {
    id: 12,
    name: "CALZADO",
    image: "/categories/Calzado.gif",
    color: "border-blue-400",
    url: "/calzado",
  },
  {
    id: 7,
    name: "MODA MUJER",
    image: "/categories/Moda_Mujer.png",
    color: "border-indigo-400",
    url: "/moda-mujer",
  },
  {
    id: 8,
    name: "MODA NIÑOS",
    image: "/categories/Moda_Niños.png",
    color: "border-teal-400",
    url: "/moda-ninos",
  },
  {
    id: 11,
    name: "BOLSOS MALETAS VIAJE",
    image: "/categories/Bolsos-Maletas-Y-Viaje.gif",
    color: "border-blue-400",
    url: "/bolsos-maletas-viaje",
  },
  {
    id: 9,
    name: "SALUD Y BELLEZA",
    image: "/categories/Salud_y_Belleza.png",
    color: "border-orange-400",
    url: "/salud-y-belleza",
  },
  {
    id: 10,
    name: "TECNOLOGÍA",
    image: "/categories/Tecnologia.png",
    color: "border-cyan-400",
    url: "/tecnologia",
  },
]

export default function CategoriesBanner() {
  const [categorySliderIndex, setCategorySliderIndex] = useState(0)

  const categoriesPerView = 10
  const maxSliderIndex = Math.max(0, mockCategories.length - categoriesPerView)

  const handleCategoryNext = () => {
    setCategorySliderIndex((prev) => Math.min(prev + 1, maxSliderIndex))
  }

  const handleCategoryPrev = () => {
    setCategorySliderIndex((prev) => Math.max(prev - 1, 0))
  }

  const getVisibleCategories = () => {
    return mockCategories.slice(
      categorySliderIndex,
      categorySliderIndex + categoriesPerView
    )
  }

  return (
    <div className="mb-6 sm:mb-8">
      {/* Mobile Categories Carousel */}
      <div className="md:hidden">
        <div className="flex gap-3 sm:gap-4 overflow-x-auto snap-x snap-mandatory pb-2 -mx-2 sm:-mx-4 px-2 sm:px-4">
          {getVisibleCategories().map((category) => (
            <div key={category.id} className="flex-shrink-0 w-32 sm:w-36 md:w-40">
              <Link href={"/categories" + category.url}>
                <div
                  className={`w-32 h-20 sm:w-36 sm:h-22 md:w-40 md:h-24 rounded-xl border-2 ${category.color} hover:scale-105 transition-transform cursor-pointer overflow-hidden relative group`}
                >
                  <Image
                    src={category.image}
                    alt={category.name}
                    width={160}
                    height={96}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/20 flex items-end p-1.5 sm:p-2">
                    <span className="text-white text-xs font-bold text-center w-full leading-tight">
                      {category.name}
                    </span>
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* Desktop Categories Grid */}
      <div className="relative hidden md:flex items-center">
        {/* Left Arrow */}
        <button
          onClick={handleCategoryPrev}
          disabled={categorySliderIndex === 0}
          className="absolute left-0 top-1/2 transform -translate-y-1/2 z-10 w-8 h-8 md:w-9 md:h-9 lg:w-10 lg:h-10 rounded-full flex items-center justify-center transition-colors shadow-lg disabled:opacity-50"
        >
          <Image
            src="/feed/Flecha.svg"
            alt="Previous"
            width={20}
            height={20}
            className="w-4 h-4 md:w-5 md:h-5"
          />
        </button>

        {/* Right Arrow */}
        <button
          onClick={handleCategoryNext}
          disabled={categorySliderIndex >= maxSliderIndex}
          className="absolute right-0 top-1/2 transform -translate-y-1/2 z-10 w-8 h-8 md:w-9 md:h-9 lg:w-10 lg:h-10 rounded-full flex items-center justify-center transition-colors shadow-lg disabled:opacity-50 transform rotate-180"
        >
          <Image
            src="/feed/Flecha.svg"
            alt="Next"
            width={20}
            height={20}
            className="w-4 h-4 md:w-5 md:h-5"
          />
        </button>

        {/* Categories Grid */}
        <div className="w-full px-4 md:px-6 lg:px-8">
          {/* First Row - 5 categories */}
          <div className="flex justify-between mb-3 md:mb-4 lg:mb-5">
            {getVisibleCategories()
              .slice(0, 5)
              .map((category) => (
                <div
                  key={category.id}
                  className="flex flex-col items-center flex-1 max-w-[160px] md:max-w-[180px] lg:max-w-[220px]"
                >
                  <Link href={"/categories" + category.url}>
                    <div
                      className={`w-32 h-20 md:w-36 md:h-24 lg:w-44 lg:h-28 rounded-lg md:rounded-xl border-2 ${category.color} hover:scale-105 transition-transform cursor-pointer overflow-hidden relative group`}
                    >
                      <Image
                        src={category.image}
                        alt={category.name}
                        width={208}
                        height={128}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-opacity-40 flex items-end p-2 md:p-2.5 lg:p-3">
                        <span className="text-white text-xs md:text-sm lg:text-base font-bold text-center w-full leading-tight">
                          {category.name}
                        </span>
                      </div>
                    </div>
                  </Link>
                </div>
              ))}
          </div>

          {/* Second Row - 4 categories */}
          <div
            className="flex justify-between"
            style={{ marginLeft: "64px", marginRight: "64px" }}
          >
            {getVisibleCategories()
              .slice(5, 9)
              .map((category) => (
                <div
                  key={category.id}
                  className="flex flex-col items-center flex-1 max-w-[160px] md:max-w-[180px] lg:max-w-[220px]"
                >
                  <Link href={"/categories" + category.url}>
                    <div
                      className={`w-32 h-20 md:w-36 md:h-24 lg:w-44 lg:h-28 rounded-lg md:rounded-xl border-2 ${category.color} hover:scale-105 transition-transform cursor-pointer overflow-hidden relative group`}
                    >
                      <Image
                        src={category.image}
                        alt={category.name}
                        width={208}
                        height={128}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 flex items-end p-2 md:p-2.5 lg:p-3">
                        <span className="text-white text-xs md:text-sm lg:text-base font-bold text-center w-full leading-tight">
                          {category.name}
                        </span>
                      </div>
                    </div>
                  </Link>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  )
}



