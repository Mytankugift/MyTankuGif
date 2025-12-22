import { Heading, Text } from "@medusajs/ui"
import InteractiveLink from "@modules/common/components/interactive-link"
import Image from "next/image"

const EmptyCartMessage = () => {
  return (
    <div 
      className="py-12 sm:py-24 md:py-32 px-4 sm:px-6 flex flex-col justify-center items-center sm:items-start bg-[#1E1E1E] border border-gray-700 rounded-lg" 
      data-testid="empty-cart-message"
    >
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 sm:gap-8 w-full max-w-2xl mx-auto">
        <div className="w-24 h-24 sm:w-32 sm:h-32 relative flex-shrink-0">
          <Image 
            src="/empty-cart.png" 
            alt="Carrito vacío"
            width={128}
            height={128}
            className="object-contain"
            onError={(e) => {
              // Fallback si la imagen no existe
              e.currentTarget.style.display = 'none'
            }}
          />
        </div>
        
        <div className="flex flex-col text-center sm:text-left">
          <Heading
            level="h1"
            className="text-2xl sm:text-3xl gap-x-2 items-baseline text-[#66DEDB] mb-3 sm:mb-4"
          >
            Tu carrito está vacío
          </Heading>
          
          <Text className="text-sm sm:text-base mb-6 max-w-[32rem] text-[#66DEDB]">
            No tienes productos en tu carrito.
          </Text>
        </div>
      </div>
    </div>
  )
}

export default EmptyCartMessage
