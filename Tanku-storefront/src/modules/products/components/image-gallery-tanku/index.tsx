
import Image from "next/image"

type ImageGalleryTankuProps = {
  thumbnail: string
}

const ImageGalleryTanku = ({ thumbnail }: ImageGalleryTankuProps) => {
  return (
    <div className="flex items-center justify-center relative aspect-[29/34] w-full ">
      <Image
        src={thumbnail}
        priority={true}
        className="absolute inset-0 object-cover object-center w-full h-full p-14"
        alt="Imagen del producto"
        fill
        sizes="(max-width: 576px) 280px, (max-width: 768px) 360px, (max-width: 992px) 480px, 800px"
      />
    </div>
  )
}

export default ImageGalleryTanku
