import React from 'react'
import Image from 'next/image'
import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Sección de Bienvenida al Marketplace */}
      <section className="py-6 px-4 bg-blue-800 text-white dark:bg-blue-900">
        <div className="container max-w-6xl mx-auto">
          <div className="text-center">
            <h2 className="text-2xl font-bold">¡Bienvenido a Tanku Marketplace!</h2>
            <p className="mt-2">La plataforma donde compradores y vendedores se conectan para disfrutar de la mejor experiencia de comercio electrónico</p>
          </div>
        </div>
      </section>
      
      {/* Sección Principal */}
      <section className="relative flex items-center justify-center py-20 px-4 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="container max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="space-y-6">
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white">
                Descubre Productos Increíbles en <span className="text-blue-600 dark:text-blue-400">Tanku</span>
              </h1>
              <p className="text-lg text-gray-700 dark:text-gray-300">
                Tu marketplace favorito con mercancía de alta calidad, precios imbatibles y servicio excepcional.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link href="/products" className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition duration-300 transform hover:scale-105">
                  Comprar Ahora
                </Link>
                <Link href="/collections" className="px-6 py-3 bg-white hover:bg-gray-100 text-blue-600 font-medium rounded-lg border border-blue-600 transition duration-300 transform hover:scale-105 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-blue-400 dark:border-blue-400">
                  Ver Colecciones
                </Link>
              </div>
            </div>
            <div className="relative h-64 md:h-96 rounded-xl overflow-hidden shadow-2xl">
              <div className="absolute inset-0 bg-gray-200 animate-pulse dark:bg-gray-700"></div>
              {/* Placeholder for actual image */}
              <div className="absolute inset-0 flex items-center justify-center text-gray-500 dark:text-gray-400">
                Imagen de Producto
              </div>
              {/* Uncomment and replace with actual image
              <Image 
                src="/images/hero-product.jpg" 
                alt="Producto Destacado" 
                fill 
                className="object-cover" 
                priority 
              />
              */}
            </div>
          </div>
        </div>
      </section>

      {/* Sección de Características */}
      <section className="py-16 px-4 bg-white dark:bg-gray-900">
        <div className="container max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900 dark:text-white">¿Por qué elegir Tanku?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-gray-50 dark:bg-gray-800 p-8 rounded-xl shadow-md transition-transform hover:scale-105">
              <div className="h-14 w-14 rounded-full bg-blue-100 flex items-center justify-center mb-4 dark:bg-blue-900">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">Calidad Garantizada</h3>
              <p className="text-gray-700 dark:text-gray-300">Seleccionamos cuidadosamente cada producto para garantizar los más altos estándares de calidad para nuestros clientes.</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 p-8 rounded-xl shadow-md transition-transform hover:scale-105">
              <div className="h-14 w-14 rounded-full bg-blue-100 flex items-center justify-center mb-4 dark:bg-blue-900">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">Entrega Rápida</h3>
              <p className="text-gray-700 dark:text-gray-300">Entendemos que el tiempo es valioso, por eso entregamos tus pedidos de manera rápida y eficiente.</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 p-8 rounded-xl shadow-md transition-transform hover:scale-105">
              <div className="h-14 w-14 rounded-full bg-blue-100 flex items-center justify-center mb-4 dark:bg-blue-900">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">Compra Fácil</h3>
              <p className="text-gray-700 dark:text-gray-300">Nuestra plataforma fácil de usar hace que las compras sean sencillas con navegación intuitiva y proceso de pago simplificado.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Categorías Populares */}
      <section className="py-16 px-4 bg-gray-50 dark:bg-gray-800">
        <div className="container max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900 dark:text-white">Categorías Populares</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {['Electrónica', 'Moda', 'Hogar y Decoración', 'Belleza y Cuidado'].map((category, index) => (
              <Link href={`/categories/${category.toLowerCase().replace(/\s+/g, '-')}`} key={index} className="group relative overflow-hidden rounded-xl bg-white shadow-md dark:bg-gray-700 h-40 transition-transform hover:scale-105">
                <div className="absolute inset-0 bg-gradient-to-br from-transparent to-black/60 z-10"></div>
                <div className="absolute inset-0 bg-gray-200 animate-pulse dark:bg-gray-600"></div>
                {/* Placeholder for actual image */}
                <div className="absolute inset-0 flex items-center justify-center text-gray-500 dark:text-gray-400 z-0">
                  Imagen de {category}
                </div>
                {/* Uncomment and replace with actual image
                <Image 
                  src={`/images/categories/${category.toLowerCase().replace(/\s+/g, '-')}.jpg`} 
                  alt={category} 
                  fill 
                  className="object-cover transition-transform group-hover:scale-110" 
                />
                */}
                <div className="absolute bottom-0 left-0 right-0 p-4 z-20">
                  <h3 className="text-lg font-semibold text-white">{category}</h3>
                </div>
              </Link>
            ))}
          </div>
          <div className="mt-12 text-center">
            <Link href="/categories" className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition duration-300 inline-block">
              Ver Todas las Categorías
            </Link>
          </div>
        </div>
      </section>

      {/* Sección CTA */}
      <section className="py-16 px-4 bg-blue-600 dark:bg-blue-800">
        <div className="container max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6 text-white">¿Listo para Descubrir Ofertas Increíbles?</h2>
          <p className="text-xl mb-8 text-blue-100">Forma parte del marketplace que conecta compradores y vendedores. Únete a miles de clientes satisfechos que compran en Tanku todos los días.</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/products" className="px-8 py-4 bg-white hover:bg-gray-100 text-blue-600 font-medium rounded-lg transition duration-300 transform hover:scale-105">
              Comenzar a Comprar
            </Link>
            <Link href="/account" className="px-8 py-4 bg-transparent hover:bg-blue-700 text-white font-medium rounded-lg border border-white transition duration-300 transform hover:scale-105">
              Crear Cuenta
            </Link>
          </div>
        </div>
      </section>

      {/* Sección de Testimonios */}
      <section className="py-16 px-4 bg-white dark:bg-gray-900">
        <div className="container max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900 dark:text-white">Lo que Dicen Nuestros Clientes</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                name: 'Alejandro Jiménez',
                testimonial: 'Tanku tiene la mejor selección de productos que he encontrado en línea. ¡Envío rápido también!',
                rating: 5,
              },
              {
                name: 'Sara Martínez',
                testimonial: 'El servicio al cliente es excepcional. Me ayudaron a encontrar exactamente lo que necesitaba.',
                rating: 5,
              },
              {
                name: 'Miguel Rodríguez',
                testimonial: 'Productos de calidad a precios razonables. ¡Definitivamente compraré aquí de nuevo!',
                rating: 4,
              }
            ].map((testimonial, index) => (
              <div key={index} className="bg-gray-50 dark:bg-gray-800 p-6 rounded-xl shadow-md">
                <div className="flex mb-4">
                  {Array(5).fill(0).map((_, i) => (
                    <svg key={i} xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${i < testimonial.rating ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'}`} viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-gray-700 dark:text-gray-300 mb-4 italic">"{testimonial.testimonial}"</p>
                <p className="font-semibold text-gray-900 dark:text-white">{testimonial.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sección de Newsletter */}
      <section className="py-16 px-4 bg-gray-50 dark:bg-gray-800">
        <div className="container max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">Manténte Actualizado</h2>
          <p className="text-lg mb-8 text-gray-700 dark:text-gray-300">Suscríbete a nuestro boletín para ofertas exclusivas y anuncios de nuevos productos.</p>
          <form className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input 
              type="email" 
              placeholder="Tu dirección de email" 
              className="flex-grow px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              required
            />
            <button 
              type="submit" 
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition duration-300">
              Suscribirse
            </button>
          </form>
        </div>
      </section>
    </div>
  )
}
