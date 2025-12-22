import { Button, Heading, Text } from "@medusajs/ui"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

const SignInPrompt = () => {
  return (
    <div className="bg-gradient-to-r from-[#1E1E1E] to-[#2D3A3A] border border-[#66DEDB]/30 rounded-lg p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
      <div className="flex-1">
        <Heading level="h2" className="text-lg sm:text-xl font-semibold text-[#66DEDB] mb-2">
          ¿Ya tienes una cuenta?
        </Heading>
        <Text className="text-sm sm:text-base text-gray-300">
          Inicia sesión para una mejor experiencia de compra.
        </Text>
      </div>
      <div className="w-full sm:w-auto">
        <LocalizedClientLink href="/account">
          <Button 
            className="w-full sm:w-auto h-10 px-6 bg-gradient-to-r from-[#66DEDB] to-[#73FFA2] hover:from-[#5accc9] hover:to-[#66e68f] text-black font-semibold rounded-full transition-all duration-300 hover:scale-105 shadow-lg" 
            data-testid="sign-in-button"
          >
            Iniciar sesión
          </Button>
        </LocalizedClientLink>
      </div>
    </div>
  )
}

export default SignInPrompt
