"use client"

import React, { useState, useEffect, useRef } from "react"
import Image from "next/image"
import {
  House,
  ShoppingBag,
  Heart,
  Star,
  Gift,
  Phone,
  Camera,
  Book,
  BuildingStorefront,
} from "@medusajs/icons"
import PreviewProductsTanku from "../components/preview-products-tanku.ts"
import BlackFridayAd from "../components/black-friday-ad"
import { fetchListStoreProduct } from "@modules/home/components/actions/get-list-store-products"
import StoryUpload, { Story } from "@modules/home/components/story-upload"
import StoryViewer from "@modules/home/components/story-viewer"
import FeedPosters from "@modules/home/components/feed-posters"
import { retrieveCustomer } from "@lib/data/customer"
import { getStories } from "@modules/home/components/actions/get-stories"
import { usePersonalInfo } from "@lib/context"
import Link from "next/link.js"
import UnifiedFeed from "@modules/home/components/unified-feed"
import MyTankuTab from "@modules/home/components/tabs/MyTankuTab"
import { retrieveCart } from "@lib/data/cart"
import {
  Popover,
  PopoverButton,
  PopoverPanel,
  Transition,
} from "@headlessui/react"
import { convertToLocale } from "@lib/util/money"
import { Button } from "@medusajs/ui"
import DeleteButton from "@modules/common/components/delete-button"
import LineItemOptions from "@modules/common/components/line-item-options"
import LineItemPrice from "@modules/common/components/line-item-price"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Thumbnail from "@modules/products/components/thumbnail"

type ApiCategory = {
  id: string
  name: string
  slug: string
  display_order?: number | null
}

// Componente CategorySelector con cuadrícula y búsqueda
const CategorySelector = ({ 
  categories, 
  selectedCategoryId, 
  onCategoryChange 
}: { 
  categories: { id: string | number; name: string; image?: string | null }[]
  selectedCategoryId: string | null
  onCategoryChange: (categoryId: string | null) => void
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const dropdownRef = React.useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearchQuery('') // Limpiar búsqueda al cerrar
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Filtrar categorías basado en la búsqueda
  const filteredCategories = categories.filter((category) =>
    category.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        onMouseDown={(e) => e.preventDefault()}
        className="px-2 py-1.5 bg-transparent text-white rounded-lg focus:outline-none focus:ring-0 active:outline-none transition-all duration-200 flex items-center justify-between cursor-pointer gap-2"
      >
        <span className="text-[#73FFA2] font-medium text-sm sm:text-base md:text-lg" style={{ fontFamily: 'Poppins, sans-serif' }}>Categorías</span>
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          width="24" 
          height="12" 
          viewBox="0 0 30 14" 
          fill="none"
          className={`transition-transform duration-200 w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 ${isOpen ? 'rotate-180' : ''}`}
        >
          <line y1="-2.5" x2="18.093" y2="-2.5" transform="matrix(-0.829163 0.559007 0.71276 0.701408 30 3.5087)" stroke="#73FFA2" strokeWidth="5"/>
          <line y1="-2.5" x2="18.0922" y2="-2.5" transform="matrix(-0.829084 -0.559124 -0.712868 0.701299 15 13.6223)" stroke="#73FFA2" strokeWidth="5"/>
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-3 bg-gray-800 border-2 border-[#73FFA2] rounded-2xl shadow-2xl z-50 p-2 sm:p-4 w-[calc(100vw-2rem)] sm:min-w-[400px] sm:max-w-[600px] md:min-w-[600px] md:max-w-[800px]">
          {/* Campo de búsqueda */}
          <div className="mb-3 relative">
            <input
              type="text"
              placeholder="Buscar categoría..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border-2 border-gray-600 focus:border-[#73FFA2] focus:outline-none transition-all duration-200"
              style={{ fontFamily: 'Poppins, sans-serif' }}
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            )}
          </div>

          {/* Botón "Todas las categorías" */}
          <button
            onClick={() => {
              onCategoryChange(null)
              setIsOpen(false)
              setSearchQuery('')
            }}
            className={`w-full mb-3 px-3 py-2 rounded-lg transition-all duration-200 text-left ${
              selectedCategoryId === null 
                ? "bg-[#73FFA2]/20 border-2 border-[#73FFA2]" 
                : "bg-gray-700/50 border-2 border-transparent hover:bg-gray-700 hover:border-[#73FFA2]/50"
            }`}
          >
            <span className="text-[#66DEDB] font-medium text-sm" style={{ fontFamily: 'Poppins, sans-serif' }}>Todas las categorías</span>
          </button>

          {/* Mensaje si no hay resultados */}
          {searchQuery && filteredCategories.length === 0 && (
            <div className="text-center py-4 text-gray-400 text-sm">
              No se encontraron categorías con "{searchQuery}"
            </div>
          )}

          {/* Cuadrícula de categorías en rectangulitos pequeños */}
          {filteredCategories.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-1.5 sm:gap-2 max-h-[400px] overflow-y-auto">
              {filteredCategories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => {
                    onCategoryChange(String(category.id))
                    setIsOpen(false)
                    setSearchQuery('')
                  }}
                  className={`px-3 py-2 rounded-lg transition-all duration-200 border-2 ${
                    selectedCategoryId === String(category.id)
                      ? "bg-[#73FFA2]/30 border-[#73FFA2] shadow-lg shadow-[#73FFA2]/30"
                      : "bg-gray-700/30 border-transparent hover:bg-gray-700/50 hover:border-[#73FFA2]/30"
                  }`}
                >
                  {/* Nombre de la categoría */}
                  <span 
                    className={`text-xs font-medium text-center block line-clamp-2 ${
                      selectedCategoryId === String(category.id) ? "text-[#73FFA2]" : "text-gray-300"
                    }`}
                    style={{ fontFamily: 'Poppins, sans-serif' }}
                  >
                    {category.name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Componente CartDropdownButton para la barra de navegación
const CartDropdownButton = ({ cart, cartItemsCount }: { cart: any, cartItemsCount: number }) => {
  const [isOpen, setIsOpen] = useState(false)
  
  const totalItems = cartItemsCount
  
  // Calcular total desde los items usando item.total que viene del backend
  const calculatedSubtotal = cart?.items?.reduce((sum: number, item: any) => {
    // El backend ya calcula item.total = unit_price * quantity
    const itemTotal = item.total 
      || (item.unit_price ? item.unit_price * (item.quantity || 0) : 0)
      || 0
    return sum + itemTotal
  }, 0) || 0

  // Usar subtotal del backend si existe y es mayor a 0, sino calcular desde items
  const baseSubtotal = (cart?.subtotal && cart.subtotal > 0) ? cart.subtotal : calculatedSubtotal
  
  // El unit_price que viene del backend ya tiene el incremento aplicado (15% + $10,000)
  // NO debemos aplicar el incremento nuevamente
  const calculatedTotal = cart?.items?.reduce((sum: number, item: any) => {
    const price = item.unit_price || item.variant?.calculated_price?.calculated_amount || (item.variant as any)?.price || 0
    return sum + (price * (item.quantity || 0))
  }, 0) || 0
  
  // Usar el subtotal del backend o el calculado
  const total = baseSubtotal > 0 ? baseSubtotal : calculatedTotal

  return (
    <Popover className="relative" onMouseEnter={() => setIsOpen(true)} onMouseLeave={() => setIsOpen(false)}>
      <PopoverButton className="flex items-center justify-center w-8 h-8 md:w-9 md:h-9 lg:w-10 lg:h-10 bg-transparent rounded-full hover:bg-gray-700 transition-colors cursor-pointer group relative">
        <Image
          src="/feed/Icons/Shopping_Cart_Green.png"
          alt="Carrito"
          width={24}
          height={24}
          className="object-contain group-hover:hidden w-5 h-5 md:w-6 md:h-6"
        />
        <Image
          src="/feed/Icons/Shopping_Cart_Blue.png"
          alt="Carrito"
          width={24}
          height={24}
          className="object-contain hidden group-hover:block w-5 h-5 md:w-6 md:h-6"
        />
        {totalItems > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center text-[10px] sm:text-xs font-bold">
            {totalItems > 99 ? '99+' : totalItems}
          </span>
        )}
      </PopoverButton>
      <Transition
        show={isOpen}
        as={React.Fragment}
        enter="transition ease-out duration-200"
        enterFrom="opacity-0 translate-y-1"
        enterTo="opacity-100 translate-y-0"
        leave="transition ease-in duration-150"
        leaveFrom="opacity-100 translate-y-0"
        leaveTo="opacity-0 translate-y-1"
      >
        <PopoverPanel
          static
          className="absolute top-[calc(100%+8px)] right-0 bg-[#1E1E1E] border border-gray-600 w-[280px] sm:w-[320px] md:w-[380px] text-[#66DEDB] rounded-md shadow-lg z-50"
        >
          <div className="p-3 sm:p-4 flex items-center justify-center border-b border-gray-600">
            <h3 className="text-base sm:text-lg font-semibold text-[#66DEDB]">Carrito</h3>
          </div>
          {cart && cart.items?.length ? (
            <>
              <div className="overflow-y-auto max-h-[250px] sm:max-h-[300px] px-3 sm:px-4 grid grid-cols-1 gap-y-6 sm:gap-y-8 scrollbar-hide py-3 sm:py-4">
                {cart.items
                  .sort((a: any, b: any) => {
                    return (a.created_at ?? "") > (b.created_at ?? "")
                      ? -1
                      : 1
                  })
                  .map((item: any) => (
                    <div
                      className="grid grid-cols-[70px_1fr] sm:grid-cols-[80px_1fr] gap-x-3 sm:gap-x-4"
                      key={item.id}
                    >
                      <LocalizedClientLink
                        href={`/products/${item.product_handle}`}
                        className="w-[70px] sm:w-20"
                      >
                        <Thumbnail
                          thumbnail={item.thumbnail}
                          images={item.variant?.product?.images}
                          size="square"
                        />
                      </LocalizedClientLink>
                      <div className="flex flex-col justify-between flex-1 min-w-0">
                        <div className="flex flex-col flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex flex-col flex-1 min-w-0">
                              <h3 className="text-xs sm:text-sm font-medium text-[#3B9BC3] truncate">
                                <LocalizedClientLink
                                  href={`/products/${item.product_handle}`}
                                >
                                  {item.title}
                                </LocalizedClientLink>
                              </h3>
                              <div className="text-[#66DEDB] [&_*]:!text-[#66DEDB] [&_*]:!color-[#66DEDB]">
                                <LineItemOptions
                                  variant={item.variant}
                                />
                              </div>
                              <span className="text-[10px] sm:text-xs text-[#66DEDB]">
                                Cantidad: {item.quantity}
                              </span>
                            </div>
                            <div className="flex justify-end flex-shrink-0">
                              <div className="text-[#66DEDB] [&_*]:!text-[#66DEDB] [&_span]:!text-[#66DEDB] [&_p]:!text-[#66DEDB]">
                                <LineItemPrice
                                  item={item}
                                  style="tight"
                                  currencyCode={cart.currency_code}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                        <DeleteButton
                          id={item.id}
                          className="mt-1 text-[10px] sm:text-xs text-[#E73230] hover:text-[#ff5652]"
                        >
                          Eliminar
                        </DeleteButton>
                      </div>
                    </div>
                  ))}
              </div>
              <div className="p-3 sm:p-4 flex flex-col gap-y-3 sm:gap-y-4 text-small-regular border-t border-gray-600">
                <div className="flex items-center justify-between">
                  <span className="text-[#66DEDB] font-semibold text-xs sm:text-sm">
                    Total{" "}
                    <span className="font-normal text-[10px] sm:text-xs">(excl. impuestos)</span>
                  </span>
                  <span className="text-sm sm:text-base font-semibold text-[#66DEDB]">
                    {convertToLocale({
                      amount: total,
                      currency_code: cart.currency_code,
                    })}
                  </span>
                </div>
                <LocalizedClientLink href="/cart" passHref>
                  <Button
                    className="w-full bg-[#3B9BC3] hover:bg-[#2A7A9B] text-white border-none text-xs sm:text-sm py-2 sm:py-3 transition-all duration-200 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
                    size="large"
                    onClick={() => setIsOpen(false)}
                  >
                    Ir al carrito
                  </Button>
                </LocalizedClientLink>
              </div>
            </>
          ) : (
            <div>
              <div className="flex py-8 sm:py-12 flex-col gap-y-3 sm:gap-y-4 items-center justify-center">
                <div className="bg-[#3B9BC3] text-small-regular flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full text-white">
                  <span>0</span>
                </div>
                <span className="text-xs sm:text-sm text-[#66DEDB]">Tu carrito está vacío.</span>
                <div>
                  <LocalizedClientLink href="/store">
                    <Button 
                      onClick={() => setIsOpen(false)} 
                      size="small"
                      className="bg-[#3B9BC3] hover:bg-[#2A7A9B] text-white border-none text-xs sm:text-sm py-1.5 sm:py-2 px-3 sm:px-4 transition-all duration-200 hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
                    >
                      Explorar productos
                    </Button>
                  </LocalizedClientLink>
                </div>
              </div>
            </div>
          )}
        </PopoverPanel>
      </Transition>
    </Popover>
  )
}

// Componente FilterSelector
const FilterSelector = () => {
  const [isOpen, setIsOpen] = useState(false)
  const filters = [
    { id: "personas", label: "Personas" },
    { id: "marcas", label: "Marcas" },
    { id: "productos", label: "Productos" },
    { id: "servicios", label: "Servicios" }
  ]
  const [selectedFilters, setSelectedFilters] = useState<string[]>(filters.map(f => f.label))
  const dropdownRef = React.useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-transparent text-white focus:outline-none focus:ring-2 focus:ring-[#73FFA2]/20 transition-all duration-200 flex items-center justify-center cursor-pointer p-0"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="48" viewBox="0 0 71 48" fill="none" className="h-6 w-auto sm:h-8 md:h-10 lg:h-12">
          <line x1="16" y1="29.5" x2="56" y2="29.5" stroke="#73FFA2" strokeWidth="3"/>
          <rect x="1.5" y="1.5" width="68" height="45" rx="22.5" stroke="#73FFA2" strokeWidth="3"/>
          <line x1="16" y1="17.5" x2="56" y2="17.5" stroke="#73FFA2" strokeWidth="3"/>
          <circle cx="44" cy="17" r="5" fill="#73FFA2"/>
          <circle cx="28" cy="30" r="5" fill="#73FFA2"/>
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 bg-gray-800 border border-[#73FFA2] rounded-2xl shadow-xl z-10 overflow-hidden whitespace-nowrap min-w-fit">
          {filters.map((filter) => {
            const isSelected = selectedFilters.includes(filter.label)
            return (
              <button
                key={filter.id}
                onClick={() => {
                  setSelectedFilters(prev => 
                    isSelected 
                      ? prev.filter(f => f !== filter.label)
                      : [...prev, filter.label]
                  )
                }}
                className="w-full px-4 py-1 flex items-center gap-3 hover:bg-gray-700 transition-colors duration-200 text-left"
              >
                <div className="relative w-5 h-5 flex items-center justify-center">
                  {isSelected ? (
                    <div className="w-5 h-5 rounded-full border-2 border-[#66DEDB] flex items-center justify-center bg-transparent">
                      <div className="w-3 h-3 rounded-full bg-[#66DEDB]"></div>
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-gray-500"></div>
                  )}
                </div>
                <span className="text-[#66DEDB] font-medium">{filter.label}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}


function HomeContent() {
  // Context for personal info
  const {
    personalInfo,
    isLoading,
    getUser,
    refreshPersonalInfo,
    clearPersonalInfo,
  } = usePersonalInfo()

  const [userStories, setUserStories] = useState<Story[]>([])
  const [friendsStories, setFriendsStories] = useState<Story[]>([])
  const [allStories, setAllStories] = useState<Story[]>([])
  const [isViewerOpen, setIsViewerOpen] = useState(false)
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0)
  const [products, setProducts] = useState<any[]>([])
  const [storiesLoading, setStoriesLoading] = useState(false)
  const [isHeaderVisible, setIsHeaderVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)
  const isRestoringScrollRef = useRef(false)
  const [isLightMode, setIsLightMode] = useState(false)
  const [apiCategories, setApiCategories] = useState<ApiCategory[]>([])
  const [productsLoading, setProductsLoading] = useState(false)
  const [hasMoreProducts, setHasMoreProducts] = useState(true)
  const [productsOffset, setProductsOffset] = useState(0)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [allProducts, setAllProducts] = useState<any[]>([]) // Todos los productos cargados (sin filtrar)
  const [allProductsByCategory, setAllProductsByCategory] = useState<Map<string | null, any[]>>(new Map()) // Productos cargados por categoría
  const [productSearchQuery, setProductSearchQuery] = useState<string>('') // Búsqueda de productos
  const [cart, setCart] = useState<any>(null) // Estado del carrito
  const [cartItemsCount, setCartItemsCount] = useState(0) // Contador de items en el carrito
  // OPTIMIZACIÓN: Carga inicial rápida + infinite scroll ágil
  const INITIAL_PRODUCTS = 12 // Cargar 12 productos inicialmente (balance velocidad/contenido)
  const PRODUCTS_PER_PAGE = 100 // Cargar 100 productos adicionales en cada scroll (consistente)
  
  // Refs para mantener valores actuales en el Intersection Observer
  const hasMoreProductsRef = useRef(hasMoreProducts)
  const productsLoadingRef = useRef(productsLoading)
  const productsOffsetRef = useRef(productsOffset)
  const selectedCategoryIdRef = useRef(selectedCategoryId)
  const isInitialMountRef = useRef(true)
  const allProductsByCategoryRef = useRef(allProductsByCategory)
  
  // Actualizar refs cuando cambian los valores
  useEffect(() => {
    hasMoreProductsRef.current = hasMoreProducts
  }, [hasMoreProducts])
  
  useEffect(() => {
    productsLoadingRef.current = productsLoading
  }, [productsLoading])
  
  useEffect(() => {
    productsOffsetRef.current = productsOffset
  }, [productsOffset])
  
  useEffect(() => {
    selectedCategoryIdRef.current = selectedCategoryId
  }, [selectedCategoryId])
  
  useEffect(() => {
    allProductsByCategoryRef.current = allProductsByCategory
  }, [allProductsByCategory])
  
  // Load cart on component mount
  useEffect(() => {
    const loadCart = async () => {
      try {
        const cartData = await retrieveCart().catch(() => null)
        setCart(cartData)
        // Actualizar contador siempre, incluso si no hay items (para mostrar 0)
        if (cartData?.items && Array.isArray(cartData.items)) {
          const totalItems = cartData.items.reduce((acc: number, item: any) => acc + (item.quantity || 0), 0)
          setCartItemsCount(totalItems)
        } else {
          // Si no hay items o el carrito es null, el contador debe ser 0
          setCartItemsCount(0)
        }
      } catch (error) {
        console.error("Error loading cart:", error)
        // En caso de error, asegurar que el contador esté en 0
        setCartItemsCount(0)
      }
    }
    loadCart()
    
    // Escuchar eventos de actualización del carrito (sin recargar toda la página)
    // Funciona tanto con sesión como sin sesión
    const handleCartUpdate = () => {
      console.log('🛒 [FEED] Evento cartUpdated recibido, actualizando carrito...')
      loadCart()
    }
    
    if (typeof window !== 'undefined') {
      window.addEventListener('cartUpdated', handleCartUpdate)
    }
    
    // OPTIMIZACIÓN: Eliminar polling constante. El carrito se actualiza mediante eventos
    // Si necesitas actualización periódica, usar un intervalo más largo (ej: 30 segundos)
    // o mejor aún, usar WebSockets/Socket.io para actualizaciones en tiempo real
    // const cartInterval = setInterval(loadCart, 30000) // 30 segundos si es necesario
    
    return () => {
      // clearInterval(cartInterval) // Ya no hay intervalo
      if (typeof window !== 'undefined') {
        window.removeEventListener('cartUpdated', handleCartUpdate)
      }
    }
  }, [])

  // Load products on component mount (primera carga)
  useEffect(() => {
    // Solo refrescar si no hay información personal cargada
    // Esto evita recargas innecesarias cuando ya hay sesión
    if (!personalInfo?.id) {
      refreshPersonalInfo()
    }
    
    // Caché por categoría para navegación rápida
    const getCacheKey = (categoryId: string | null) => `tanku_feed_products_${categoryId || 'all'}`
    const getCacheTimestampKey = (categoryId: string | null) => `tanku_feed_timestamp_${categoryId || 'all'}`
    // OPTIMIZACIÓN: Aumentar duración del cache a 15 minutos para mejor rendimiento
    const CACHE_DURATION = 15 * 60 * 1000 // 15 minutos
    
    const loadFromCache = (categoryId: string | null) => {
      try {
        const CACHE_KEY = getCacheKey(categoryId)
        const CACHE_TIMESTAMP_KEY = getCacheTimestampKey(categoryId)
        const cached = sessionStorage.getItem(CACHE_KEY)
        const timestamp = sessionStorage.getItem(CACHE_TIMESTAMP_KEY)
        
        if (cached && timestamp) {
          const age = Date.now() - parseInt(timestamp, 10)
          if (age < CACHE_DURATION) {
            const parsed = JSON.parse(cached)
            const cachedProducts = parsed.products || []
            setAllProducts(cachedProducts)
            setProducts(cachedProducts)
            setHasMoreProducts(parsed.hasMore || false)
            // CORRECCIÓN: Usar la cantidad REAL de productos en caché, no el offset guardado (que puede ser incorrecto)
            // Si el offset guardado es mayor que los productos, usar la cantidad real
            const cachedOffset = Math.max(
              cachedProducts.length, // ✅ Priorizar cantidad real de productos
              parsed.offset || 0 // Fallback al offset guardado si no hay productos
            )
            setProductsOffset(cachedOffset)
            productsOffsetRef.current = cachedOffset // Actualizar ref
            setProductsLoading(false)
            return true
          }
        }
      } catch (error) {
        console.error("Error cargando desde caché:", error)
      }
      return false
    }
    
    // Cargar primera página de productos
    const loadInitialProducts = async () => {
      // Si hay caché válido, usarlo
      if (loadFromCache(null)) {
        return
      }
      
      setProductsLoading(true)
      try {
        // OPTIMIZACIÓN: Cargar menos productos inicialmente para mostrar contenido más rápido
        const result = await fetchListStoreProduct(INITIAL_PRODUCTS, 0, undefined)
        const loadedProducts = result.products || []
        console.log(`📦 [FEED] Productos cargados: ${loadedProducts.length}`, {
          firstProduct: loadedProducts[0] ? {
            id: loadedProducts[0].id,
            title: loadedProducts[0].title,
            thumbnail: loadedProducts[0].thumbnail ? '✅' : '❌',
            variants: loadedProducts[0].variants?.length || 0
          } : 'ninguno'
        });
        setAllProducts(loadedProducts) // Guardar todos los productos
        setProducts(loadedProducts) // Mostrar todos inicialmente
        // CORRECCIÓN: hasMore debe calcularse correctamente
        setHasMoreProducts(result.hasMore !== undefined ? result.hasMore : (loadedProducts.length >= INITIAL_PRODUCTS))
        const initialOffset = loadedProducts.length
        setProductsOffset(initialOffset)
        productsOffsetRef.current = initialOffset // Actualizar ref
        
        // Guardar en memoria por categoría (null = todas las categorías)
        setAllProductsByCategory(prev => {
          const newMap = new Map(prev)
          newMap.set(null, loadedProducts)
          return newMap
        })
        
        // Guardar en caché
        try {
          const CACHE_KEY = getCacheKey(null)
          const CACHE_TIMESTAMP_KEY = getCacheTimestampKey(null)
          // CORRECCIÓN: Guardar offset basado en la cantidad REAL de productos cargados, no INITIAL_PRODUCTS
          const actualOffset = loadedProducts.length
          sessionStorage.setItem(CACHE_KEY, JSON.stringify({
            products: loadedProducts,
            hasMore: result.hasMore || false,
            offset: actualOffset // ✅ Usar cantidad real de productos
          }))
          sessionStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString())
        } catch (error) {
          console.error("Error guardando en caché:", error)
        }
      } catch (error: any) {
        // Solo loggear si hay un mensaje de error real
        const errorMessage = error?.message || error?.toString() || 'Error desconocido';
        if (errorMessage !== 'Error desconocido' && errorMessage !== '[object Object]') {
          console.warn("⚠️ Error cargando productos (continuando sin productos):", errorMessage);
        }
        // Mantener estado vacío en caso de error - no es crítico si no hay productos
        setAllProducts([])
        setProducts([])
        setHasMoreProducts(false)
      } finally {
        setProductsLoading(false)
      }
    }
    
    loadInitialProducts()

    // Cargar categorías reales desde el backend de Tanku
    const fetchCategories = async () => {
      try {
        const backendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL

        const url = `${backendUrl}/store/categories?t=${Date.now()}`;
        console.log(`📂 [FRONTEND] Obteniendo categorías desde: ${url}`);
        
        const res = await fetch(url, {
          method: 'GET',
          credentials: "include",
          headers: {
            "Cache-Control": "no-cache",
            "Content-Type": "application/json",
          },
        })

        console.log(`📂 [FRONTEND] Response status: ${res.status} ${res.statusText}`);
        console.log(`📂 [FRONTEND] Response headers:`, {
          'content-type': res.headers.get('content-type'),
          'access-control-allow-origin': res.headers.get('access-control-allow-origin'),
        });

        if (!res.ok) {
          // Si es 404 o no hay categorías, no es un error crítico
          if (res.status === 404) {
            console.log("ℹ️ No hay categorías disponibles aún (404)");
            setApiCategories([])
            return
          }
          // Solo loggear otros errores si son relevantes
          try {
            const errorText = await res.text()
            console.error("❌ [FRONTEND] Error al obtener categorías:", {
              status: res.status,
              statusText: res.statusText,
              error: errorText.substring(0, 200) // Limitar longitud
            })
          } catch (e) {
            console.error("❌ [FRONTEND] Error al leer respuesta de error:", e);
          }
          setApiCategories([])
          return
        }

        const json = await res.json()
        console.log(`📂 [FRONTEND] JSON recibido:`, {
          success: json.success,
          count: json.count,
          categoriesLength: json.categories?.length || 0,
          firstCategory: json.categories?.[0] || null,
        });
        
        if (json.success && Array.isArray(json.categories)) {
          console.log(`✅ [FRONTEND] Estableciendo ${json.categories.length} categorías`);
          setApiCategories(json.categories)
        } else {
          console.warn(`⚠️ [FRONTEND] Formato de respuesta inesperado:`, {
            hasSuccess: 'success' in json,
            successValue: json.success,
            hasCategories: 'categories' in json,
            isArray: Array.isArray(json.categories),
          });
        }
      } catch (e: any) {
        // Solo loggear si hay un mensaje de error real - las categorías son opcionales
        const errorMessage = e?.message || e?.toString() || 'Error desconocido';
        if (errorMessage !== 'Error desconocido' && errorMessage !== '[object Object]') {
          console.warn("⚠️ Error al cargar categorías (continuando sin categorías):", errorMessage);
        }
        // Mantener categorías vacías - no es crítico
        setApiCategories([])
      }
    }

    fetchCategories()
    
    // DESHABILITADO: El prefetch está causando sobrecarga y múltiples requests en paralelo
    // Esto hace que el backend se sature y todas las cargas se vuelvan lentas
    // TODO: Implementar prefetch inteligente solo después de que la carga inicial esté completa
  }, [])

  // Cargar productos cuando cambia la categoría
  useEffect(() => {
    // Si hay búsqueda activa, no cambiar productos (la búsqueda tiene prioridad)
    if (productSearchQuery.trim()) {
      console.log(`[CATEGORY-CHANGE] ⏭️ Skip (búsqueda activa: "${productSearchQuery}")`)
      return
    }
    
    const categoryLabel = selectedCategoryId ? selectedCategoryId.slice(-6) : 'TODAS'
    console.log(`[CATEGORY-CHANGE] 🔄 Categoría: ${categoryLabel}`)
    
    // Skip SOLO en el montaje inicial cuando selectedCategoryId es null (ya se carga en el otro useEffect)
    // Pero si el usuario cambia a "Todas las categorías" después, sí debe ejecutarse
    if (isInitialMountRef.current && selectedCategoryId === null) {
      console.log(`[CATEGORY-CHANGE] ⏭️ Skip inicial (ya cargado)`)
      isInitialMountRef.current = false
      return
    }
    isInitialMountRef.current = false
    
    // OPTIMIZACIÓN: Limpiar productos inmediatamente cuando cambia la categoría (mostrar skeleton)
    // Esto hace que el skeleton aparezca de inmediato mientras cargan los nuevos productos
    setProducts([])
    setProductsLoading(true)
    setProductsOffset(0)
    productsOffsetRef.current = 0 // Actualizar ref inmediatamente
    
    // OPTIMIZACIÓN: Si ya tenemos productos cargados para esta categoría, usarlos INMEDIATAMENTE
    // Sin delays innecesarios (como ML/Amazon)
    const cachedProducts = allProductsByCategory.get(selectedCategoryId)
    if (cachedProducts && cachedProducts.length > 0) {
      // Calcular el offset correcto basado en la cantidad de productos ya cargados
      const correctOffset = cachedProducts.length
      // Mostrar productos inmediatamente sin delay
      setProducts(cachedProducts)
      setProductsOffset(correctOffset)
      productsOffsetRef.current = correctOffset // Actualizar ref
      setProductsLoading(false)
      return
    }
    
    // Si no hay productos cargados para esta categoría, intentar cargar desde caché o backend
    const getCacheKey = (categoryId: string | null) => `tanku_feed_products_${categoryId || 'all'}`
    const getCacheTimestampKey = (categoryId: string | null) => `tanku_feed_timestamp_${categoryId || 'all'}`
    // OPTIMIZACIÓN: Aumentar duración del cache a 15 minutos para mejor rendimiento
    const CACHE_DURATION = 15 * 60 * 1000 // 15 minutos
    
    const loadFromCache = (categoryId: string | null) => {
      try {
        const CACHE_KEY = getCacheKey(categoryId)
        const CACHE_TIMESTAMP_KEY = getCacheTimestampKey(categoryId)
        const cached = sessionStorage.getItem(CACHE_KEY)
        const timestamp = sessionStorage.getItem(CACHE_TIMESTAMP_KEY)
        
        if (cached && timestamp) {
          const age = Date.now() - parseInt(timestamp, 10)
          if (age < CACHE_DURATION) {
            const parsed = JSON.parse(cached)
            const loadedProducts = parsed.products || []
            
            // Guardar en memoria para acceso rápido
            setAllProductsByCategory(prev => {
              const newMap = new Map(prev)
              newMap.set(categoryId, loadedProducts)
              return newMap
            })
            
            setProducts(loadedProducts)
            setHasMoreProducts(parsed.hasMore || false)
            const cachedOffset = loadedProducts.length // Usar la cantidad real de productos cargados
            setProductsOffset(cachedOffset)
            productsOffsetRef.current = cachedOffset // Actualizar ref
            setProductsLoading(false)
            return true
          }
        }
      } catch (error) {
        console.error("Error cargando desde caché:", error)
      }
      return false
    }
    
    const loadProductsForCategory = async () => {
      // Intentar cargar desde caché primero
      if (loadFromCache(selectedCategoryId)) {
        console.log(`[LOAD-CAT] ✅ Cache: ${selectedCategoryId?.slice(-6) || 'TODAS'}`)
        return
      }
      
      // Si no hay caché, cargar desde backend
      console.log(`[LOAD-CAT] 📡 Backend: ${selectedCategoryId?.slice(-6) || 'TODAS'}`)
      try {
        // OPTIMIZACIÓN: Cargar menos productos inicialmente al cambiar categoría
        // Cargar productos con filtro de categoría desde el backend
        // Si selectedCategoryId es null, cargar TODOS los productos (sin filtro)
        // IMPORTANTE: Pasar undefined explícitamente cuando es null para que no se envíe category_id
        const categoryIdForFetch = selectedCategoryId === null ? undefined : selectedCategoryId
        const result = await fetchListStoreProduct(INITIAL_PRODUCTS, 0, categoryIdForFetch)
        const loadedProducts = result.products || []
        
        console.log(`[LOAD-CAT] ✅ ${loadedProducts.length} prods, hasMore=${result.hasMore}`)
        
        // Guardar en memoria para acceso rápido
        setAllProductsByCategory(prev => {
          const newMap = new Map(prev)
          newMap.set(selectedCategoryId, loadedProducts)
          return newMap
        })
        
        setProducts(loadedProducts)
        // CORRECCIÓN: hasMore debe calcularse correctamente
        setHasMoreProducts(result.hasMore !== undefined ? result.hasMore : (loadedProducts.length >= INITIAL_PRODUCTS))
        const newOffset = loadedProducts.length
        setProductsOffset(newOffset)
        productsOffsetRef.current = newOffset // Actualizar ref
        
        // Guardar en caché por categoría
        try {
          const CACHE_KEY = getCacheKey(selectedCategoryId)
          const CACHE_TIMESTAMP_KEY = getCacheTimestampKey(selectedCategoryId)
          // CORRECCIÓN: Guardar offset basado en la cantidad REAL de productos cargados, no INITIAL_PRODUCTS
          const actualOffset = loadedProducts.length
          // Guardar todos los productos cargados (no solo los primeros)
          const cacheData = {
            products: loadedProducts, // ✅ Guardar todos los productos cargados
            hasMore: result.hasMore || false,
            offset: actualOffset, // ✅ Usar cantidad real de productos
            totalLoaded: loadedProducts.length
          }
          sessionStorage.setItem(CACHE_KEY, JSON.stringify(cacheData))
          sessionStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString())
        } catch (error) {
          console.error("Error guardando en caché:", error)
        }
      } catch (error: any) {
        console.error("Error cargando productos por categoría:", {
          message: error?.message,
          stack: error?.stack,
          categoryId: selectedCategoryId,
          url: `${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/store/product/`,
          error
        })
        // Mantener estado vacío en caso de error
        setProducts([])
        setHasMoreProducts(false)
      } finally {
        setProductsLoading(false)
      }
    }
    
    loadProductsForCategory()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategoryId, productSearchQuery])

  // Búsqueda de productos en el backend (busca en TODOS los productos de la BD)
  useEffect(() => {
    // Debounce para evitar demasiadas peticiones mientras el usuario escribe
    const searchTimeout = setTimeout(() => {
      if (productSearchQuery.trim()) {
        console.log(`[SEARCH] 🔍 Buscando: "${productSearchQuery}"`)
        setProductsLoading(true)
        setProducts([])
        setProductsOffset(0)
        productsOffsetRef.current = 0
        setHasMoreProducts(true)
        
        // Buscar en el backend (ignora categoría cuando hay búsqueda)
        fetchListStoreProduct(INITIAL_PRODUCTS, 0, undefined, productSearchQuery.trim())
          .then((result) => {
            const searchProducts = result.products || []
            console.log(`[SEARCH] ✅ Encontrados: ${searchProducts.length} productos`)
            setProducts(searchProducts)
            setHasMoreProducts(result.hasMore || false)
            const newOffset = searchProducts.length
            setProductsOffset(newOffset)
            productsOffsetRef.current = newOffset
            
            // Scroll al inicio para mostrar resultados
            const scrollContainer = document.querySelector('.custom-scrollbar') as HTMLElement
            if (scrollContainer) {
              scrollContainer.scrollTop = 0
            }
          })
          .catch((error) => {
            console.error("[SEARCH] ❌ Error buscando productos:", error)
            setProducts([])
            setHasMoreProducts(false)
          })
          .finally(() => {
            setProductsLoading(false)
          })
      } else {
        // Si se limpia la búsqueda, restaurar productos de la categoría seleccionada
        console.log(`[SEARCH] 🧹 Búsqueda limpiada, restaurando categoría`)
        setProductsLoading(true)
        
        // Cargar productos de la categoría seleccionada (o todos si es null)
        const categoryIdForFetch = selectedCategoryId === null ? undefined : selectedCategoryId
        fetchListStoreProduct(INITIAL_PRODUCTS, 0, categoryIdForFetch)
          .then((result) => {
            const categoryProducts = result.products || []
            console.log(`[SEARCH] ✅ Productos de categoría restaurados: ${categoryProducts.length}`)
            
            // Restaurar productos de la categoría
            setProducts(categoryProducts)
            setHasMoreProducts(result.hasMore || false)
            const newOffset = categoryProducts.length
            setProductsOffset(newOffset)
            productsOffsetRef.current = newOffset
            
            // Actualizar caché de categoría
            setAllProductsByCategory(prev => {
              const newMap = new Map(prev)
              newMap.set(selectedCategoryId, categoryProducts)
              return newMap
            })
          })
          .catch((error) => {
            console.error("[SEARCH] ❌ Error restaurando categoría:", error)
          })
          .finally(() => {
            setProductsLoading(false)
          })
      }
    }, 500) // Esperar 500ms después de que el usuario deje de escribir

    return () => clearTimeout(searchTimeout)
  }, [productSearchQuery])

  // Cuando se cambia la categoría, resetear el scroll al inicio del feed y mover el slider
  useEffect(() => {
    // Limpiar búsqueda cuando se cambia de categoría
    setProductSearchQuery('')
    // Restaurar el scroll a funcionar normalmente
    isRestoringScrollRef.current = false
    
    if (selectedCategoryId !== null) {
      // Resetear scroll del feed
      const scrollContainer = document.querySelector('.custom-scrollbar') as HTMLElement
      if (scrollContainer) {
        scrollContainer.scrollTo({ top: 0, behavior: 'smooth' })
      }

      // Mover el slider para mostrar la categoría seleccionada cerca de la izquierda
      const categoriesScroll = document.getElementById('categories-scroll')
      if (categoriesScroll) {
        // Buscar el botón de la categoría seleccionada
        const categoryButton = categoriesScroll.querySelector(`[data-category-id="${selectedCategoryId}"]`) as HTMLElement
        if (categoryButton) {
          // Calcular la posición para centrar la categoría cerca del lado izquierdo
          const scrollLeft = categoryButton.offsetLeft - 8 // 8px de margen (gap-2)
          categoriesScroll.scrollTo({ 
            left: Math.max(0, scrollLeft), 
            behavior: 'smooth' 
          })
        }
      }
    } else {
      // Si no hay categoría seleccionada, mover el slider al inicio
      const categoriesScroll = document.getElementById('categories-scroll')
      if (categoriesScroll) {
        categoriesScroll.scrollTo({ left: 0, behavior: 'smooth' })
      }
    }
  }, [selectedCategoryId])

  // Infinite scroll usando Intersection Observer (más eficiente que scroll events)
  useEffect(() => {
    // No configurar observer si no hay más productos o hay búsqueda activa
    if (!hasMoreProducts || productSearchQuery.trim()) {
      return
    }

    const sentinelId = 'infinite-scroll-sentinel'
    let observer: IntersectionObserver | null = null
    let isLoadingMore = false // Flag local para evitar múltiples cargas
    let setupTimeout: NodeJS.Timeout | null = null

    const setupObserver = () => {
      // Limpiar timeout anterior si existe
      if (setupTimeout) {
        clearTimeout(setupTimeout)
        setupTimeout = null
      }

      // Si está cargando, no configurar observer
      if (productsLoadingRef.current) {
        return
      }

      const sentinel = document.getElementById(sentinelId)
      if (!sentinel) {
        return
      }

      const scrollContainer = document.querySelector('.custom-scrollbar') as HTMLElement
      if (!scrollContainer) {
        return
      }

      // Desconectar observer anterior si existe
      if (observer) {
        observer.disconnect()
        observer = null
      }

      // Configurar Intersection Observer
      observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0]
          
          // Verificar condiciones antes de cargar - SOLO cuando realmente está visible y cerca del final
          if (
            !entry.isIntersecting || // No está visible
            !hasMoreProductsRef.current || // No hay más productos
            productsLoadingRef.current || // Ya está cargando
            isLoadingMore // Ya se inició una carga
          ) {
            return
          }

          // Si hay búsqueda activa, permitir cargar más resultados de búsqueda
          // (no retornar aquí, continuar con la lógica de carga)
          
          // CORRECCIÓN: Scroll más permisivo para cargar más productos
          // Solo verificar que haya scroll mínimo para evitar carga automática al montar
          const scrollTop = scrollContainer.scrollTop
          const scrollHeight = scrollContainer.scrollHeight
          const clientHeight = scrollContainer.clientHeight
          const scrollPercentage = (scrollTop / (scrollHeight - clientHeight)) * 100
          
          // Página corta = pocos productos, permitir carga inmediata
          const isShortPage = scrollHeight - clientHeight < 1500
          
          // Permitir carga si:
          // 1. Página corta (< 1500px scrolleable) y hay algún scroll (>5%)
          // 2. Página normal y scroll > 15%
          if (isShortPage) {
            if (scrollPercentage < 5 && scrollTop < 100) {
              return // Evitar carga automática solo en montaje
            }
          } else if (scrollPercentage < 15) {
            return
          }

          // Marcar como cargando inmediatamente para evitar múltiples cargas
          isLoadingMore = true
          productsLoadingRef.current = true
          setProductsLoading(true)
          
          const currentCategoryId = selectedCategoryIdRef.current
          const currentSearchQuery = productSearchQuery.trim()
          
          // Si hay búsqueda activa, usar offset de productos de búsqueda
          // Si no hay búsqueda, usar offset de productos de categoría
          let currentOffset: number
          if (currentSearchQuery) {
            // Búsqueda activa: usar cantidad de productos de búsqueda cargados
            currentOffset = products.length
            console.log(`[INFINITE-SCROLL] 🔍 Búsqueda activa: "${currentSearchQuery}" - Offset: ${currentOffset}`)
          } else {
            // Sin búsqueda: usar productos de categoría
            const currentProductsForCategory = allProductsByCategoryRef.current.get(currentCategoryId) || []
            currentOffset = currentProductsForCategory.length
            console.log(`[INFINITE-SCROLL] Cargando más productos - Offset: ${currentOffset}, Categoría: ${currentCategoryId || 'all'}, Productos cargados: ${currentProductsForCategory.length}`)
          }
          
          // Guardar posición del scroll ANTES de actualizar productos (solo si no hay búsqueda)
          const savedScrollTop = currentSearchQuery ? 0 : (scrollContainer.scrollTop || 0)
          const savedScrollHeight = scrollContainer.scrollHeight
          
          // IMPORTANTE: Si hay búsqueda, pasar el término de búsqueda y NO category_id
          // Si no hay búsqueda, pasar category_id normalmente
          const categoryIdForFetch = currentSearchQuery ? undefined : (currentCategoryId === null ? undefined : currentCategoryId)
          fetchListStoreProduct(PRODUCTS_PER_PAGE, currentOffset, categoryIdForFetch, currentSearchQuery || undefined)
            .then((result) => {
              const newProducts = result.products || []
              const categoryId = selectedCategoryIdRef.current
              
              console.log(`[INFINITE-SCROLL] Productos recibidos: ${newProducts.length}, HasMore: ${result.hasMore}, IDs: ${newProducts.map((p: any) => p.id).slice(0, 5).join(', ')}`)
              
              if (newProducts.length === 0) {
                // No hay más productos, desactivar observer
                setHasMoreProducts(false)
                hasMoreProductsRef.current = false
                isLoadingMore = false
                productsLoadingRef.current = false
                setProductsLoading(false)
                if (observer) {
                  observer.disconnect()
                }
                return
              }
              
              // Si hay búsqueda activa, agregar directamente a productos (no a categoría)
              // Si no hay búsqueda, agregar a categoría como antes
              const currentSearchQuery = productSearchQuery.trim()
              
              if (currentSearchQuery) {
                // Búsqueda activa: agregar directamente a productos
                const existingIds = new Set(products.map((p: any) => p.id))
                const uniqueNewProducts = newProducts.filter((p: any) => !existingIds.has(p.id))
                
                // Agregar productos directamente
                setProducts((prev) => {
                  const allIds = new Set(prev.map((p: any) => p.id))
                  const unique = newProducts.filter((p: any) => !allIds.has(p.id))
                  return [...prev, ...unique]
                })
                
                // Actualizar offset basado en productos de búsqueda
                const newOffset = products.length + uniqueNewProducts.length
                productsOffsetRef.current = newOffset
                setProductsOffset(newOffset)
                
                console.log(`[INFINITE-SCROLL] 🔍 Búsqueda: Productos agregados - Nuevos: ${uniqueNewProducts.length}, Total: ${products.length + uniqueNewProducts.length}`)
              } else {
                // Sin búsqueda: agregar a categoría como antes
                setAllProductsByCategory(prev => {
                  const newMap = new Map(prev)
                  const currentProducts = newMap.get(categoryId) || []
                  // Filtrar duplicados antes de agregar
                  const existingIds = new Set(currentProducts.map((p: any) => p.id))
                  const uniqueNewProducts = newProducts.filter((p: any) => !existingIds.has(p.id))
                  const updated = [...currentProducts, ...uniqueNewProducts]
                  newMap.set(categoryId, updated)
                  
                  // Actualizar el ref también
                  allProductsByCategoryRef.current = newMap
                  
                  // Calcular el nuevo offset basado en la cantidad total de productos cargados
                  const newOffset = updated.length
                  productsOffsetRef.current = newOffset
                  setProductsOffset(newOffset)
                  
                  console.log(`[INFINITE-SCROLL] Productos actualizados - Total: ${updated.length}, Nuevos: ${uniqueNewProducts.length}`)
                  
                  return newMap
                })
                
                setAllProducts((prev) => {
                  // Filtrar duplicados
                  const existingIds = new Set(prev.map((p: any) => p.id))
                  const uniqueNewProducts = newProducts.filter((p: any) => !existingIds.has(p.id))
                  return [...prev, ...uniqueNewProducts]
                })
              }
              
              // Agregar productos de forma gradual para que se sienta más natural
              const existingIds = new Set(products.map((p: any) => p.id))
              const uniqueNewProducts = newProducts.filter((p: any) => !existingIds.has(p.id))
              
              // Agregar productos en batches pequeños con delays para animación suave
              const batchSize = 8
              const batches: any[][] = []
              for (let i = 0; i < uniqueNewProducts.length; i += batchSize) {
                batches.push(uniqueNewProducts.slice(i, i + batchSize))
              }
              
              // Agregar el primer batch después de un pequeño delay
              setTimeout(() => {
                setProducts((prev) => {
                  const existingIds = new Set(prev.map((p: any) => p.id))
                  const uniqueBatch = batches[0].filter((p: any) => !existingIds.has(p.id))
                  return [...prev, ...uniqueBatch]
                })
                
                // Agregar los demás batches con delays progresivos
                batches.slice(1).forEach((batch: any[], index: number) => {
                  setTimeout(() => {
                    setProducts((prev) => {
                      const existingIds = new Set(prev.map((p: any) => p.id))
                      const uniqueBatch = batch.filter((p: any) => !existingIds.has(p.id))
                      return [...prev, ...uniqueBatch]
                    })
                  }, (index + 1) * 80) // 80ms entre cada batch para animación suave
                })
              }, 100) // Pequeño delay inicial para que se sienta más natural
              
              console.log(`[INFINITE-SCROLL] Productos mostrados - Nuevos: ${uniqueNewProducts.length}, Batches: ${batches.length}`)
              
              // NO restaurar scroll si hay búsqueda activa
              if (productSearchQuery.trim()) {
                return
              }
              
              // Restaurar posición del scroll DESPUÉS de que React actualice el DOM
              // Usar múltiples requestAnimationFrame para asegurar que el DOM se haya actualizado completamente
              isRestoringScrollRef.current = true
              
              // Función para restaurar el scroll de manera robusta
              const restoreScroll = (attempts = 0) => {
                // Si hay búsqueda activa, no restaurar
                if (productSearchQuery.trim()) {
                  isRestoringScrollRef.current = false
                  return
                }
                
                if (attempts > 10) {
                  // Si después de 10 intentos no funciona, desactivar el flag
                  isRestoringScrollRef.current = false
                  return
                }
                
                requestAnimationFrame(() => {
                  if (!scrollContainer) {
                    isRestoringScrollRef.current = false
                    return
                  }
                  
                  const currentScrollHeight = scrollContainer.scrollHeight
                  const previousScrollHeight = savedScrollHeight
                  const heightDifference = currentScrollHeight - previousScrollHeight
                  
                  // Si el contenido aún no ha crecido (masonry aún no calculó), intentar de nuevo
                  if (heightDifference === 0 && attempts < 5) {
                    setTimeout(() => restoreScroll(attempts + 1), 50)
                    return
                  }
                  
                  // Los nuevos productos se agregan al final, así que mantenemos la posición absoluta
                  // del scroll (los productos nuevos están más abajo, no afectan la posición actual)
                  scrollContainer.scrollTop = savedScrollTop
                  
                  // Actualizar lastScrollY para que no se detecte como movimiento hacia arriba
                  setLastScrollY(savedScrollTop)
                  
                  // Permitir que el handler de scroll vuelva a funcionar después de un delay
                  setTimeout(() => {
                    isRestoringScrollRef.current = false
                  }, 200)
                })
              }
              
              // Iniciar la restauración después de que todos los productos se hayan agregado
              // Calcular el delay basado en la cantidad de batches
              const totalBatches = batches.length
              const totalDelay = totalBatches > 0 ? (totalBatches - 1) * 80 + 250 : 250
              
              setTimeout(() => {
                restoreScroll(0)
              }, totalDelay)
              
              setHasMoreProducts(result.hasMore || false)
              hasMoreProductsRef.current = result.hasMore || false
              
              // Resetear flags después de que el DOM se actualice
              setTimeout(() => {
                isLoadingMore = false
                productsLoadingRef.current = false
                setProductsLoading(false)
                
                // Reconfigurar observer después de cargar
                if (hasMoreProductsRef.current && !productsLoadingRef.current) {
                  setupTimeout = setTimeout(setupObserver, 100)
                }
              }, 300)
            })
            .catch((error: any) => {
              console.error("[INFINITE-SCROLL] Error cargando más productos:", {
                message: error?.message,
                stack: error?.stack,
                offset: currentOffset,
                categoryId: currentCategoryId,
                error
              })
              isLoadingMore = false
              productsLoadingRef.current = false
              setProductsLoading(false)
              
              // Reconfigurar observer después del error
              if (hasMoreProductsRef.current && !productsLoadingRef.current) {
                setupTimeout = setTimeout(setupObserver, 500)
              }
            })
        },
        {
          root: scrollContainer,
          rootMargin: '1200px', // Cargar cuando está a 1200px del final (anticipación moderada)
          threshold: 0.01 // Solo necesita estar 1% visible para activarse
        }
      )

      observer.observe(sentinel)
    }

    // Configurar observer después de que los productos se rendericen
    setupTimeout = setTimeout(setupObserver, 500)

    return () => {
      if (setupTimeout) {
        clearTimeout(setupTimeout)
      }
      if (observer) {
        observer.disconnect()
      }
      isLoadingMore = false
    }
    // Array de dependencias constante - solo recrear cuando cambia la categoría, productos por página o si hay más productos
  }, [selectedCategoryId, PRODUCTS_PER_PAGE, hasMoreProducts])

  // Handle scroll to show/hide header
  useEffect(() => {
    let ticking = false

    const handleScroll = () => {
          // Ignorar eventos de scroll si estamos restaurando la posición o hay búsqueda activa
          if (isRestoringScrollRef.current || productSearchQuery.trim()) {
            return
          }

      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrollContainer = document.querySelector('.custom-scrollbar') as HTMLElement
          
          if (!scrollContainer) {
            ticking = false
            return
          }

          const scrollTop = scrollContainer.scrollTop
          
          // Si está en la parte superior, siempre mostrar
          if (scrollTop <= 5) {
            setIsHeaderVisible(true)
            setLastScrollY(scrollTop)
            ticking = false
            return
          }

          // Si está bajando (scroll hacia abajo), ocultar solo después de cierto umbral
          if (scrollTop > lastScrollY && scrollTop > 200) {
            setIsHeaderVisible(false)
          } 
          // Si está subiendo (scroll hacia arriba), mostrar
          else if (scrollTop < lastScrollY) {
            setIsHeaderVisible(true)
          }

      setLastScrollY(scrollTop)
      ticking = false
    })
    ticking = true
  }
}

    const scrollContainer = document.querySelector('.custom-scrollbar')
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll, { passive: true })
      return () => {
        scrollContainer.removeEventListener('scroll', handleScroll)
      }
    }
  }, [lastScrollY, productSearchQuery])

  // Load stories when user is available
  useEffect(() => {
    if (personalInfo?.id) {
      setStoriesLoading(true)
      getStories(personalInfo.id)
        .then((response) => {
          if (response.success) {
            // Convertir las historias de la base de datos al formato esperado por el frontend
            const convertedUserStories = response.userStories.map(
              (story: any) => ({
                id: story.id,
                customer_id: story.customer_id,
                name: story.customer_name || "Tú", // Nombre real del usuario
                avatar: "/feed/avatar.png", // Avatar por defecto
                timestamp: new Date(story.created_at),
                media:
                  story.files?.map((file: any) => ({
                    id: file.id,
                    type: file.file_type,
                    url: file.file_url,
                  })) || [],
              })
            )

            const convertedFriendsStories = response.friendsStories.map(
              (story: any) => ({
                id: story.id,
                customer_id: story.customer_id,
                name: story.customer_name || "Amigo", // Nombre real del amigo
                avatar: "/feed/avatar.png", // Avatar por defecto
                timestamp: new Date(story.created_at),
                media:
                  story.files?.map((file: any) => ({
                    id: file.id,
                    type: file.file_type,
                    url: file.file_url,
                  })) || [],
              })
            )

            setUserStories(convertedUserStories)
            setFriendsStories(convertedFriendsStories)
          }
        })
        .catch((error) => {
          console.error("Error loading stories:", error)
        })
        .finally(() => {
          setStoriesLoading(false)
        })
    }
  }, [personalInfo?.id])

  // Group stories by user and update all stories when user or friends stories change
  useEffect(() => {
    const allStoriesArray = [...userStories, ...friendsStories]

    console.log("=== AGRUPAMIENTO DE HISTORIAS ===")
    console.log("Total historias antes de agrupar:", allStoriesArray.length)
    console.log(
      "Historias individuales:",
      allStoriesArray.map((s) => ({
        id: s.id,
        customer_id: s.customer_id,
        name: s.name,
      }))
    )

    // Group stories by customer_id to show only one bubble per user
    const groupedStories = allStoriesArray.reduce((acc: any, story: any) => {
      const customerId = story.customer_id

      console.log(
        `Procesando historia: ${story.id}, customer_id: ${customerId}, nombre: ${story.name}`
      )

      if (!customerId) {
        console.warn("Historia sin customer_id:", story)
        return acc
      }

      if (!acc[customerId]) {
        // First story for this user - create the group
        console.log(`Creando nuevo grupo para customer_id: ${customerId}`)
        acc[customerId] = {
          id: story.id,
          customer_id: customerId,
          name: story.name,
          avatar: story.avatar,
          timestamp: story.timestamp,
          media: [...story.media],
          stories: [story],
        }
      } else {
        // Additional story for existing user - merge media and update timestamp if newer
        console.log(
          `Agregando historia al grupo existente para customer_id: ${customerId}`
        )
        acc[customerId].media.push(...story.media)
        acc[customerId].stories.push(story)

        // Keep the most recent timestamp
        if (story.timestamp > acc[customerId].timestamp) {
          acc[customerId].timestamp = story.timestamp
        }
      }

      return acc
    }, {})

    // Convert back to array and sort by most recent timestamp
    const groupedStoriesArray = Object.values(groupedStories).sort(
      (a: any, b: any) => b.timestamp.getTime() - a.timestamp.getTime()
    ) as Story[]

    console.log("Total grupos después de agrupar:", groupedStoriesArray.length)
    console.log(
      "Grupos finales:",
      groupedStoriesArray.map((s) => ({
        customer_id: s.customer_id,
        name: s.name,
        totalMedia: s.media?.length,
        totalStories: s.stories?.length,
      }))
    )

    setAllStories(groupedStoriesArray)
  }, [userStories, friendsStories])

  const handleStoryCreate = (newStory: Story) => {
    // Agregar la historia temporalmente al estado local para feedback inmediato
    setUserStories((prev) => [newStory, ...prev])

    // Recargar todas las historias desde la base de datos para obtener la información completa
    if (personalInfo?.id) {
      getStories(personalInfo.id)
        .then((response) => {
          if (response.success) {
            // Convertir las historias de la base de datos al formato esperado por el frontend
            const convertedUserStories = response.userStories.map(
              (story: any) => ({
                id: story.id,
                customer_id: story.customer_id,
                name: story.customer_name || "Tú",
                avatar: "/feed/avatar.png",
                timestamp: new Date(story.created_at),
                media:
                  story.files?.map((file: any) => ({
                    id: file.id,
                    type: file.file_type,
                    url: file.file_url,
                  })) || [],
              })
            )

            const convertedFriendsStories = response.friendsStories.map(
              (story: any) => ({
                id: story.id,
                customer_id: story.customer_id,
                name: story.customer_name || "Amigo",
                avatar: "/feed/avatar.png",
                timestamp: new Date(story.created_at),
                media:
                  story.files?.map((file: any) => ({
                    id: file.id,
                    type: file.file_type,
                    url: file.file_url,
                  })) || [],
              })
            )

            setUserStories(convertedUserStories)
            setFriendsStories(convertedFriendsStories)
          }
        })
        .catch((error) => {
          console.error("Error reloading stories after creation:", error)
        })
    }
  }

  const handleStoryClick = (storyIndex: number) => {
    setCurrentStoryIndex(storyIndex)
    setIsViewerOpen(true)
  }

  const handleViewerClose = () => {
    setIsViewerOpen(false)
  }

  const handleStoryChange = (index: number) => {
    setCurrentStoryIndex(index)
  }


  return (
    <div
      className="w-full overflow-x-hidden flex flex-col transition-colors duration-300"
      style={{ backgroundColor: isLightMode ? "#FFFFFF" : "#1E1E1E", height: "calc(100vh - 0px)" }}
    >
      {/* Contenedor para historias, buscador, categorías y filtros - Se oculta/muestra con scroll - OVERLAY */}
      <div 
        className={`fixed top-0 left-0 lg:left-60 z-50 flex-shrink-0 shadow-lg transition-all duration-150 ease-in-out ${
          isHeaderVisible ? 'translate-y-0' : '-translate-y-full'
        } ${isLightMode ? 'bg-white' : 'bg-[#1E1E1E]'}`}
        style={{ 
          transform: isHeaderVisible ? 'translateY(0)' : 'translateY(-100%)',
          willChange: 'transform',
          right: '8px', // 20px para scrollbar + 30px reducción = 50px total
        }}
      >
        {/* Stories Section */}
        <div className="p-2 sm:p-3 md:p-4 pb-0 flex flex-col md:flex-row justify-between items-start w-full gap-2 sm:gap-3 md:gap-4">
        {/* Stories Container */}
        <div className="flex-1 min-w-0 md:mr-2 lg:mr-4">
          {/* Story Upload Component - Siempre presente pero invisible para mantener funcionalidad del modal */}
          <div style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px', overflow: 'hidden' }}>
            <StoryUpload
              onStoryCreate={handleStoryCreate}
              userAvatar={personalInfo?.avatar_url || "/feed/avatar.png"}
              userName="Tu Historia"
              customer_id={personalInfo?.id}
            />
          </div>
          
          <div className="flex gap-2 sm:gap-3 md:gap-4 overflow-x-auto pb-0 snap-x snap-mandatory">

            {/* Grouped Stories (User + Friends) */}
            {allStories.map((story, index) => (
              <div
                key={`${story.customer_id}-${story.id}`}
                className="flex flex-col items-center min-w-[60px] sm:min-w-[70px] md:min-w-[80px] flex-shrink-0 cursor-pointer"
                onClick={() => handleStoryClick(index)}
              >
                <div className="relative">
                  <div
                    className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full p-0.5 mb-1 sm:mb-1.5 md:mb-2"
                    style={{
                      background: "linear-gradient(45deg, #1A485C, #73FFA2)",
                    }}
                  >
                    <div className="w-full h-full rounded-full overflow-hidden bg-transparent">
                      {story.media && story.media.length > 0 ? (
                        story.media[0].type === "image" ? (
                          <Image
                            src={story.media[0].url}
                            alt={story.name}
                            width={60}
                            height={60}
                            className="w-full h-full object-cover"
                          />
                        ) : story.media[0].type === "video" ? (
                          <div className="relative w-full h-full">
                            <video
                              src={story.media[0].url}
                              className="w-full h-full object-cover"
                              muted
                              playsInline
                              preload="metadata"
                            />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-4 h-4 bg-white bg-opacity-80 rounded-full flex items-center justify-center">
                                <div className="w-0 h-0 border-l-[6px] border-l-gray-800 border-t-[3px] border-t-transparent border-b-[3px] border-b-transparent ml-0.5"></div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <Image
                            src={story.avatar}
                            alt={story.name}
                            width={60}
                            height={60}
                            className="w-full h-full object-cover"
                          />
                        )
                      ) : (
                        <Image
                          src={story.avatar}
                          alt={story.name}
                          width={60}
                          height={60}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                  </div>
                </div>

                {/* Story dots indicator */}
                {story.stories && story.stories.length > 1 && (
                  <div className="flex justify-center gap-1 mb-1">
                    {Array.from({
                      length: Math.min(story.stories.length, 5),
                    }).map((_, dotIndex) => (
                      <div
                        key={dotIndex}
                        className="w-1.5 h-1.5 rounded-full bg-[#66DEDB]"
                      />
                    ))}
                    {story.stories.length > 5 && (
                      <span className="text-[#66DEDB] text-xs ml-1">
                        +{story.stories.length - 5}
                      </span>
                    )}
                  </div>
                )}

                <span className="text-xs sm:text-xs md:text-xs text-white text-center max-w-[60px] sm:max-w-[70px] md:max-w-[80px] truncate">
                  {story.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Icons */}

        {/* Botón "Únete a Tanku" - Solo visible cuando no hay sesión */}
        {!personalInfo?.id && (
          <a
            href="/account"
            onClick={(e) => {
              e.preventDefault()
              window.location.href = "/account"
            }}
            className="bg-gradient-to-r from-[#66DEDB] to-[#73FFA2] text-black font-semibold px-4 py-2 sm:px-5 sm:py-2.5 rounded-full hover:shadow-lg hover:shadow-[#66DEDB]/25 transition-all duration-300 hover:transform hover:scale-105 text-xs sm:text-sm whitespace-nowrap flex-shrink-0 cursor-pointer inline-block text-center"
          >
            Únete a Tanku
          </a>
        )}

        <div className="hidden md:flex gap-2 lg:gap-3 flex-shrink-0 items-center">
          {/* Theme Toggle Button */}
          <button
            onClick={() => setIsLightMode(!isLightMode)}
            className="flex items-center justify-center w-8 h-8 md:w-9 md:h-9 lg:w-10 lg:h-10 bg-transparent rounded-full hover:bg-gray-700 transition-colors cursor-pointer"
            title={isLightMode ? "Modo oscuro" : "Modo claro"}
          >
            {isLightMode ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#73FFA2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#73FFA2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5"></circle>
                <line x1="12" y1="1" x2="12" y2="3"></line>
                <line x1="12" y1="21" x2="12" y2="23"></line>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                <line x1="1" y1="12" x2="3" y2="12"></line>
                <line x1="21" y1="12" x2="23" y2="12"></line>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
              </svg>
            )}
          </button>

          {/* Messages Icon */}
          <div className="flex items-center justify-center w-8 h-8 md:w-9 md:h-9 lg:w-10 lg:h-10 bg-transparent rounded-full hover:bg-gray-700 transition-colors cursor-pointer group">
            <Image
              src="/feed/Icons/Chat_Green.png"
              alt="Mensajes"
              width={24}
              height={24}
              className="object-contain group-hover:hidden w-5 h-5 md:w-6 md:h-6"
            />
            <Image
              src="/feed/Icons/Chat_Blue.png"
              alt="Mensajes"
              width={24}
              height={24}
              className="object-contain hidden group-hover:block w-5 h-5 md:w-6 md:h-6"
            />
          </div>

          {/* Notifications Icon */}
          <div className="flex items-center justify-center w-8 h-8 md:w-9 md:h-9 lg:w-10 lg:h-10 bg-transparent rounded-full hover:bg-gray-700 transition-colors cursor-pointer group">
            <Image
              src="/feed/Icons/Notification_Green.png"
              alt="Notificaciones"
              width={24}
              height={24}
              className="object-contain group-hover:hidden w-5 h-5 md:w-6 md:h-6"
            />
            <Image
              src="/feed/Icons/Notification_Blue.png"
              alt="Notificaciones"
              width={24}
              height={24}
              className="object-contain hidden group-hover:block w-5 h-5 md:w-6 md:h-6"
            />
          </div>

          {/* Cart Icon with Dropdown */}
          <CartDropdownButton cart={cart} cartItemsCount={cartItemsCount} />
        </div>
        </div>

        {/* Buscador debajo de historias */}
        <div className="px-2 sm:px-3 md:px-4 mb-1 pt-0">
          <div className="relative w-full">
            <div className="absolute left-2.5 top-1/2 transform -translate-y-1/2 z-10">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 41 42" fill="none" className="w-5 h-5">
                <path d="M26.8334 8.76545L30.1099 22.6447L20.9442 31.156L8.1482 27.8382L4.84774 14.0188L14.8779 5.75197L26.8334 8.76545Z" stroke="#262626" strokeWidth="3"/>
                <line y1="-1.5" x2="20.427" y2="-1.5" transform="matrix(0.709973 0.704229 -0.70423 0.709971 24.3841 27.5551)" stroke="#262626" strokeWidth="3"/>
              </svg>
            </div>
            <input
              type="text"
              placeholder="Buscar productos..."
              value={productSearchQuery}
              onChange={(e) => {
                setProductSearchQuery(e.target.value)
                // Si se limpia la búsqueda, restaurar el scroll
                if (!e.target.value.trim()) {
                  isRestoringScrollRef.current = false
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && productSearchQuery.trim()) {
                  // Al presionar Enter, filtrar productos por búsqueda
                  // Desactivar completamente la restauración de scroll cuando se busca
                  isRestoringScrollRef.current = true
                  // Scroll al inicio para mostrar los resultados de búsqueda
                  const scrollContainer = document.querySelector('.custom-scrollbar') as HTMLElement
                  if (scrollContainer) {
                    // Usar scroll instantáneo para evitar conflictos
                    scrollContainer.scrollTop = 0
                    // Mantener desactivado mientras haya búsqueda activa
                  }
                }
              }}
              className="w-full pl-10 pr-3 py-2 text-sm bg-white text-black rounded-full border border-gray-300 focus:border-[#66DEDB] focus:outline-none focus:ring-2 focus:ring-[#66DEDB]/20 transition-all duration-200"
            />
          </div>
        </div>

        {/* Selector de categorías, filtros y botones de categorías - Solo mostrar si hay categorías */}
        {apiCategories.length > 0 && (
        <div className="px-2 sm:px-3 md:px-4 mb-1 pt-1">
        <div className="flex items-center gap-3 w-full">
          {/* Desplegable de categorías */}
          <CategorySelector
            categories={apiCategories.map((c) => ({
              id: c.id,
              name: c.name,
              image: null,
            }))}
            selectedCategoryId={selectedCategoryId}
            onCategoryChange={setSelectedCategoryId}
          />
          
          {/* Botones de categorías con imagen y nombre (scrollable) */}
          <div className="relative flex-1 min-w-0">
            {/* Flecha izquierda */}
            <button
              onClick={() => {
                const container = document.getElementById('categories-scroll')
                if (container) {
                  container.scrollBy({ left: -200, behavior: 'smooth' })
                }
              }}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-gray-800/80 hover:bg-gray-700 rounded-full p-1 transition-all duration-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="17" height="40" viewBox="0 0 17 40" fill="none" className="w-4 h-10">
                <line y1="-2.5" x2="24.1241" y2="-2.5" transform="matrix(-0.55901 0.829161 -0.701411 -0.712757 13.4858 0)" stroke="#3B9BC3" strokeWidth="5"/>
                <line y1="-2.5" x2="24.1231" y2="-2.5" transform="matrix(0.559128 0.829082 -0.701302 0.712865 0.000488281 20)" stroke="#3B9BC3" strokeWidth="5"/>
              </svg>
            </button>
            
            {/* Contenedor scrollable */}
            <div 
              id="categories-scroll"
              className="flex gap-2 overflow-x-auto snap-x snap-mandatory pb-2 ml-8 mr-8 scrollbar-hide scroll-smooth"
            >
              {/* Botón "Todas" al inicio */}
              <button
                key="all-categories"
                data-category-id="all"
                onClick={() => setSelectedCategoryId(null)}
                className={`flex-shrink-0 flex flex-col items-center justify-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl transition-all duration-300 border-2 min-w-[80px] sm:min-w-[100px] ${
                  selectedCategoryId === null
                    ? "bg-gradient-to-r from-[#73FFA2] to-[#66DEDB] border-[#73FFA2] shadow-lg shadow-[#73FFA2]/30 scale-105"
                    : "bg-gray-700/50 border-transparent hover:bg-gray-700 hover:border-[#73FFA2]/30 hover:scale-105"
                }`}
              >
                <span className={`text-xs sm:text-sm font-semibold text-center line-clamp-2 ${
                  selectedCategoryId === null ? "text-black" : "text-white"
                }`} style={{ fontFamily: 'Poppins, sans-serif' }}>
                  Todas
                </span>
              </button>
              
              {apiCategories.map((c, index) => {
                const category = {
                  id: c.id,
                  name: c.name,
                  image: "/categories/Salud_y_Belleza.png", // placeholder
                  url: `/${c.slug || c.name.toLowerCase().replace(/\s+/g, '-')}`,
                }
                // Colores vivos aleatorios basados en el índice
                const vibrantColors = [
                  'bg-gradient-to-r from-pink-500 to-rose-500',
                  'bg-gradient-to-r from-purple-500 to-indigo-500',
                  'bg-gradient-to-r from-blue-500 to-cyan-500',
                  'bg-gradient-to-r from-green-500 to-emerald-500',
                  'bg-gradient-to-r from-yellow-500 to-orange-500',
                  'bg-gradient-to-r from-red-500 to-pink-500',
                  'bg-gradient-to-r from-indigo-500 to-purple-500',
                  'bg-gradient-to-r from-cyan-500 to-blue-500',
                  'bg-gradient-to-r from-emerald-500 to-teal-500',
                  'bg-gradient-to-r from-orange-500 to-red-500',
                  'bg-gradient-to-r from-violet-500 to-purple-500',
                  'bg-gradient-to-r from-teal-500 to-cyan-500',
                  'bg-gradient-to-r from-amber-500 to-yellow-500',
                  'bg-gradient-to-r from-fuchsia-500 to-pink-500',
                  'bg-gradient-to-r from-sky-500 to-blue-500',
                  'bg-gradient-to-r from-lime-500 to-green-500',
                ]
                const colorClass = vibrantColors[index % vibrantColors.length]
                const isSelected = selectedCategoryId === String(category.id)
                
                return (
                  <button
                    key={category.id}
                    data-category-id={String(category.id)}
                    onClick={() => setSelectedCategoryId(String(category.id))}
                    className="flex-shrink-0 snap-start cursor-pointer group"
                  >
                    <div className={`flex items-center h-8 sm:h-9 rounded-full overflow-hidden border-2 transition-all duration-300 ${
                      isSelected
                        ? 'border-[#73FFA2] scale-105 shadow-lg shadow-[#73FFA2]/50'
                        : 'border-gray-600 group-hover:border-[#73FFA2]'
                    } ${colorClass}`}>
                      {/* Imagen a la izquierda */}
                      <div className="relative w-8 sm:w-9 h-full flex-shrink-0">
                        <Image
                          src={category.image}
                          alt={category.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                      {/* Nombre a la derecha */}
                      <div className="flex items-center px-2 sm:px-3 flex-1 min-w-0">
                        <span className={`text-xs sm:text-sm font-bold leading-tight whitespace-nowrap drop-shadow-md ${
                          isSelected ? 'text-[#73FFA2]' : 'text-white'
                        }`}>
                          {category.name}
                        </span>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
            
            {/* Flecha derecha */}
            <button
              onClick={() => {
                const container = document.getElementById('categories-scroll')
                if (container) {
                  container.scrollBy({ left: 200, behavior: 'smooth' })
                }
              }}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-gray-800/80 hover:bg-gray-700 rounded-full p-1 transition-all duration-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="17" height="40" viewBox="0 0 17 40" fill="none" className="w-4 h-10">
                <line y1="-2.5" x2="24.1241" y2="-2.5" transform="matrix(0.55901 0.829161 0.701411 -0.712757 3.50879 0)" stroke="#3B9BC3" strokeWidth="5"/>
                <line y1="-2.5" x2="24.1231" y2="-2.5" transform="matrix(-0.559128 0.829082 0.701302 0.712865 16.9941 20)" stroke="#3B9BC3" strokeWidth="5"/>
              </svg>
            </button>
          </div>

          {/* Selector de filtros (Personas, Marcas, Productos, Servicios) */}
          <FilterSelector />
          
        </div>
        </div>
        )}
      </div>

      {/* Contenido principal - MyTankuTab directamente sin tabs - Scrollable - Padding fijo para overlay */}
      <div 
        className="flex-1 overflow-y-auto px-2 sm:px-3 md:px-4 py-2 sm:py-4 md:py-5 custom-scrollbar transition-all duration-300 ease-in-out"
        style={{
          paddingTop: '180px', // Padding reducido para subir el feed
          marginRight: '0', // Sin margen extra, el scrollbar se mostrará naturalmente
          scrollBehavior: 'smooth', // Scroll suave
        }}
      >
        <MyTankuTab 
          products={products} 
          customerId={personalInfo?.id || ""} 
          isLightMode={isLightMode} 
          isLoading={productsLoading}
          PRODUCTS_PER_PAGE={PRODUCTS_PER_PAGE}
          hidePostersWhileLoading={productsLoading && products.length === 0}
        />
        
        {/* Sentinel para Intersection Observer (invisible, usado para detectar cuando está cerca del final) */}
        {hasMoreProducts && (
          <div 
            id="infinite-scroll-sentinel" 
            style={{ 
              height: '1px', 
              width: '100%', 
              marginTop: '40px',
              marginBottom: '40px',
              visibility: 'hidden',
              pointerEvents: 'none'
            }} 
          />
        )}
        
        {/* Mensaje cuando no hay más productos */}
        {!hasMoreProducts && products.length > 0 && !productsLoading && (
          <div className="flex justify-center items-center py-8">
            <div className="text-white text-sm opacity-70">No hay más productos</div>
          </div>
        )}
        
        {/* Mensaje cuando no hay productos en la categoría seleccionada */}
        {!productsLoading && products.length === 0 && selectedCategoryId !== null && (
          <div className="flex flex-col justify-center items-center py-12">
            <div className={`text-lg sm:text-xl font-semibold mb-2 ${isLightMode ? 'text-gray-800' : 'text-white'}`}>
              No hay productos en esta categoría
            </div>
            <div className={`text-sm opacity-70 ${isLightMode ? 'text-gray-600' : 'text-gray-400'}`}>
              Intenta con otra categoría o busca productos
            </div>
          </div>
        )}
      </div>

      {/* Story Viewer Modal */}
      {isViewerOpen && allStories.length > 0 && (
        <StoryViewer
          stories={allStories}
          currentStoryIndex={currentStoryIndex}
          onClose={handleViewerClose}
          onStoryChange={handleStoryChange}
        />
      )}

      <style jsx>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: rgba(115, 255, 162, 0.5) transparent;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(115, 255, 162, 0.4);
          border-radius: 10px;
          transition: background 0.2s ease;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(115, 255, 162, 0.6);
        }
      `}</style>
    </div>
  )
}

export default HomeContent
