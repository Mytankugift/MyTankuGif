"use client"

import Image from "next/image"
import { useState } from "react"

type ImageGalleryTankuProps = {
  thumbnail: string
  images?: Array<{ id?: string; url: string }>
}

const ImageGalleryTanku = ({ thumbnail, images = [] }: ImageGalleryTankuProps) => {
  // Combinar thumbnail con las demás imágenes
  const allImages = [
    { id: 'thumbnail', url: thumbnail },
    ...images.filter(img => img.url && img.url !== thumbnail) // Evitar duplicados
  ]
  
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const selectedImage = allImages[selectedImageIndex] || allImages[0]

  // Si solo hay una imagen, no mostrar el selector
  const hasMultipleImages = allImages.length > 1

  return (
    <div className="flex flex-col gap-4">
      {/* Imagen principal */}
      <div className="flex items-center justify-center relative aspect-[29/34] w-full">
        <Image
          src={selectedImage.url}
          priority={true}
          className="absolute inset-0 object-cover object-center w-full h-full p-14"
          alt="Imagen del producto"
          fill
          sizes="(max-width: 576px) 280px, (max-width: 768px) 360px, (max-width: 992px) 480px, 800px"
        />
      </div>

      {/* Selector de imágenes (solo si hay más de una) */}
      {hasMultipleImages && (
        <div className="flex gap-2 justify-center flex-wrap">
          {allImages.map((image, index) => (
            <button
              key={image.id || index}
              onClick={() => setSelectedImageIndex(index)}
              className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden border-2 transition-all ${
                selectedImageIndex === index
                  ? 'border-[#3B9BC3] ring-2 ring-[#3B9BC3] ring-opacity-50'
                  : 'border-gray-600 hover:border-gray-400'
              }`}
              aria-label={`Seleccionar imagen ${index + 1}`}
            >
              <Image
                src={image.url}
                alt={`Miniatura ${index + 1}`}
                fill
                className="object-cover"
                sizes="80px"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default ImageGalleryTanku
