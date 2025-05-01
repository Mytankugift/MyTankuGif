import { Text } from "@medusajs/ui"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Image from "next/image"

export default async function Footer() {
  return (
    <footer className="w-full bg-black text-white">
      <div className="content-container flex flex-col w-full py-12">
        <div className="flex flex-wrap justify-between items-center gap-8">
          {/* Logo */}
          <div className="flex">
            <Image 
              src="/LogoTanku.png"
              alt="Tanku Logo"
              width={80}
              height={45}
              className="object-contain"
            />
          </div>
          
          {/* Links - centro izquierda */}
          <div className="flex flex-col sm:flex-row gap-6">
            <div className="flex flex-col gap-y-2">
              <LocalizedClientLink href="/terms" className="text-gray-300 hover:text-white">
                Términos y Condiciones
              </LocalizedClientLink>
              <LocalizedClientLink href="/privacy" className="text-gray-300 hover:text-white">
                Políticas de Privacidad
              </LocalizedClientLink>
              <LocalizedClientLink href="/purchase" className="text-gray-300 hover:text-white">
                Políticas de Compra
              </LocalizedClientLink>
            </div>
            
            {/* Links - centro derecha */}
            <div className="flex flex-col gap-y-2">
              <LocalizedClientLink href="/contact" className="text-gray-300 hover:text-white">
                Contacto
              </LocalizedClientLink>
              <LocalizedClientLink href="/sell" className="text-gray-300 hover:text-white">
                Vende
              </LocalizedClientLink>
              <LocalizedClientLink href="/help" className="text-gray-300 hover:text-white">
                Ayuda
              </LocalizedClientLink>
            </div>
          </div>
          
          {/* Idiomas */}
          <div className="flex flex-col gap-y-2">
            <LocalizedClientLink href="/es" className="text-gray-300 hover:text-white">
              Español
            </LocalizedClientLink>
            <LocalizedClientLink href="/en" className="text-gray-300 hover:text-white">
              English
            </LocalizedClientLink>
            <LocalizedClientLink href="/fr" className="text-gray-300 hover:text-white">
              Français
            </LocalizedClientLink>
          </div>
          
          {/* Redes sociales */}
          <div className="flex gap-4">
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-white">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22 12C22 6.48 17.52 2 12 2C6.48 2 2 6.48 2 12C2 16.84 5.44 20.87 10 21.8V15H8V12H10V9.5C10 7.57 11.57 6 13.5 6H16V9H14C13.45 9 13 9.45 13 10V12H16V15H13V21.95C18.05 21.45 22 17.19 22 12Z" fill="currentColor"/>
              </svg>
            </a>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-white">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C14.717 2 15.056 2.01 16.122 2.06C17.187 2.11 17.912 2.277 18.55 2.525C19.21 2.779 19.766 3.123 20.322 3.678C20.8305 4.1779 21.224 4.78259 21.475 5.45C21.722 6.087 21.89 6.813 21.94 7.878C21.987 8.944 22 9.283 22 12C22 14.717 21.99 15.056 21.94 16.122C21.89 17.187 21.722 17.912 21.475 18.55C21.2247 19.2178 20.8311 19.8226 20.322 20.322C19.822 20.8303 19.2173 21.2238 18.55 21.475C17.913 21.722 17.187 21.89 16.122 21.94C15.056 21.987 14.717 22 12 22C9.283 22 8.944 21.99 7.878 21.94C6.813 21.89 6.088 21.722 5.45 21.475C4.78233 21.2245 4.17753 20.8309 3.678 20.322C3.16941 19.8222 2.77593 19.2175 2.525 18.55C2.277 17.913 2.11 17.187 2.06 16.122C2.013 15.056 2 14.717 2 12C2 9.283 2.01 8.944 2.06 7.878C2.11 6.812 2.277 6.088 2.525 5.45C2.77524 4.78218 3.1688 4.17732 3.678 3.678C4.17767 3.16923 4.78243 2.77573 5.45 2.525C6.088 2.277 6.812 2.11 7.878 2.06C8.944 2.013 9.283 2 12 2ZM12 7C10.6739 7 9.40215 7.52678 8.46447 8.46447C7.52678 9.40215 7 10.6739 7 12C7 13.3261 7.52678 14.5979 8.46447 15.5355C9.40215 16.4732 10.6739 17 12 17C13.3261 17 14.5979 16.4732 15.5355 15.5355C16.4732 14.5979 17 13.3261 17 12C17 10.6739 16.4732 9.40215 15.5355 8.46447C14.5979 7.52678 13.3261 7 12 7ZM18.5 6.75C18.5 6.41848 18.3683 6.10054 18.1339 5.86612C17.8995 5.6317 17.5815 5.5 17.25 5.5C16.9185 5.5 16.6005 5.6317 16.3661 5.86612C16.1317 6.10054 16 6.41848 16 6.75C16 7.08152 16.1317 7.39946 16.3661 7.63388C16.6005 7.8683 16.9185 8 17.25 8C17.5815 8 17.8995 7.8683 18.1339 7.63388C18.3683 7.39946 18.5 7.08152 18.5 6.75ZM12 9C12.7956 9 13.5587 9.31607 14.1213 9.87868C14.6839 10.4413 15 11.2044 15 12C15 12.7956 14.6839 13.5587 14.1213 14.1213C13.5587 14.6839 12.7956 15 12 15C11.2044 15 10.4413 14.6839 9.87868 14.1213C9.31607 13.5587 9 12.7956 9 12C9 11.2044 9.31607 10.4413 9.87868 9.87868C10.4413 9.31607 11.2044 9 12 9Z" fill="currentColor"/>
              </svg>
            </a>
            <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-white">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21.543 6.498C22 8.28 22 12 22 12C22 12 22 15.72 21.543 17.502C21.289 18.487 20.546 19.262 19.605 19.524C17.896 20 12 20 12 20C12 20 6.107 20 4.395 19.524C3.45 19.258 2.708 18.484 2.457 17.502C2 15.72 2 12 2 12C2 12 2 8.28 2.457 6.498C2.711 5.513 3.454 4.738 4.395 4.476C6.107 4 12 4 12 4C12 4 17.896 4 19.605 4.476C20.55 4.742 21.292 5.516 21.543 6.498ZM10 15.5L16 12L10 8.5V15.5Z" fill="currentColor"/>
              </svg>
            </a>
            <a href="https://tiktok.com" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-white">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M16.6 5.82C15.9165 5.03962 15.5397 4.03743 15.54 3H12.45V16.5C12.4494 17.0269 12.2788 17.5386 11.9659 17.9622C11.6529 18.3858 11.2144 18.6999 10.7103 18.8593C10.2062 19.0187 9.66551 19.0152 9.16379 18.8493C8.66207 18.6834 8.22775 18.3637 7.92 17.935C7.54284 17.4059 7.3524 16.7665 7.38128 16.1176C7.41016 15.4688 7.65654 14.8499 8.08397 14.3567C8.51141 13.8636 9.09566 13.5256 9.73942 13.4016C10.3832 13.2776 11.049 13.3748 11.625 13.675V10.55C10.5267 10.4133 9.42323 10.6449 8.47772 11.2099C7.53221 11.7749 6.79388 12.6439 6.37394 13.6849C5.954 14.726 5.87583 15.8799 6.15134 16.9737C6.42685 18.0675 7.04059 19.0463 7.9055 19.7736C8.9616 20.6421 10.3058 21.0883 11.6818 21.0237C13.0578 20.9591 14.3557 20.3883 15.335 19.4223C16.3143 18.4562 16.9119 17.1669 17.0132 15.7932C17.1144 14.4194 16.7128 13.0624 15.885 11.9975V8.355C16.9492 9.12472 18.1747 9.63306 19.47 9.845V6.75C18.4599 6.571 17.4934 6.1789 16.635 5.595" fill="currentColor" />
              </svg>
            </a>
          </div>
        </div>
        
        {/* Copyright */}
        <div className="mt-8 text-center text-xs text-gray-400">
          Todos los derechos reservados © TANKU GIFT 2025
        </div>
      </div>
    </footer>
  )
}
