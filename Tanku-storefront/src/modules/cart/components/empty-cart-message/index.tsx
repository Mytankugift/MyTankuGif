import { Heading, Text } from "@medusajs/ui"

import InteractiveLink from "@modules/common/components/interactive-link"

const EmptyCartMessage = () => {
  return (
    <div className="py-48 px-2 flex flex-col justify-center items-start bg-[#1E1E1E] border border-gray-700 rounded-lg" data-testid="empty-cart-message">
      <Heading
        level="h1"
        className="flex flex-row text-3xl gap-x-2 items-baseline text-[#66DEDB]"
      >
        Carrito
      </Heading>
      <Text className="mt-4 mb-6 max-w-[32rem] text-[#66DEDB]">
        No tienes productos en tu carrito. Explora nuestra tienda para encontrar productos increíbles.
      </Text>
      <div>
        <InteractiveLink href="/store" className="text-[#3B9BC3] hover:text-[#2A7A9B]">Explorar productos</InteractiveLink>
      </div>
    </div>
  )
}

export default EmptyCartMessage
