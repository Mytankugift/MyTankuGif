'use client'

import Link from 'next/link'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#1E1E1E] text-white py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <Link
          href="/feed"
          className="inline-flex items-center gap-2 text-[#73FFA2] hover:text-[#66DEDB] transition-colors mb-8"
          style={{ fontFamily: 'Poppins, sans-serif' }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Volver al feed
        </Link>

        <div className="bg-[#2D3A3A] border-2 border-[#73FFA2] rounded-2xl p-8 space-y-6">
          <h1
            className="text-3xl font-bold text-[#73FFA2] mb-6"
            style={{ fontFamily: 'Poppins, sans-serif' }}
          >
            Términos y Condiciones
          </h1>

          <div className="space-y-6 text-gray-300" style={{ fontFamily: 'Poppins, sans-serif' }}>
            <section>
              <h2 className="text-xl font-semibold text-[#66DEDB] mb-3">1. Aceptación de los Términos</h2>
              <p className="text-sm leading-relaxed">
                Al acceder y utilizar Tanku, aceptas estar sujeto a estos términos y condiciones. 
                Si no estás de acuerdo con alguna parte de estos términos, no debes utilizar nuestros servicios.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#66DEDB] mb-3">2. Uso del Servicio</h2>
              <p className="text-sm leading-relaxed">
                Tanku es una plataforma de comercio social que permite a los usuarios compartir contenido, 
                interactuar con otros usuarios y realizar compras. Te comprometes a utilizar el servicio de 
                manera responsable y conforme a la ley.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#66DEDB] mb-3">3. Cuenta de Usuario</h2>
              <p className="text-sm leading-relaxed">
                Eres responsable de mantener la confidencialidad de tu cuenta y contraseña. 
                Aceptas notificarnos inmediatamente sobre cualquier uso no autorizado de tu cuenta.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#66DEDB] mb-3">4. Contenido del Usuario</h2>
              <p className="text-sm leading-relaxed">
                Eres el único responsable del contenido que publiques en Tanku. No debes publicar contenido 
                que sea ilegal, difamatorio, obsceno, o que viole los derechos de terceros.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#66DEDB] mb-3">5. Propiedad Intelectual</h2>
              <p className="text-sm leading-relaxed">
                Todo el contenido de Tanku, incluyendo pero no limitado a textos, gráficos, logos, 
                iconos, imágenes y software, es propiedad de Tanku o sus proveedores de contenido y 
                está protegido por las leyes de propiedad intelectual.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#66DEDB] mb-3">6. Tratamiento de Datos Personales</h2>
              <p className="text-sm leading-relaxed">
                Al utilizar Tanku, aceptas que procesemos tus datos personales de acuerdo con nuestra 
                política de privacidad. Recopilamos información como nombre, email, datos de navegación, 
                información de compras y contenido que publiques.
              </p>
              <p className="text-sm leading-relaxed mt-2">
                Utilizamos tus datos para proporcionar y mejorar nuestros servicios, gestionar tu cuenta, 
                procesar compras, enviar comunicaciones relacionadas con el servicio y personalizar tu experiencia.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#66DEDB] mb-3">7. Modificaciones</h2>
              <p className="text-sm leading-relaxed">
                Nos reservamos el derecho de modificar estos términos en cualquier momento. 
                Los cambios entrarán en vigor inmediatamente después de su publicación. 
                Es tu responsabilidad revisar estos términos periódicamente.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#66DEDB] mb-3">8. Limitación de Responsabilidad</h2>
              <p className="text-sm leading-relaxed">
                Tanku no será responsable por ningún daño directo, indirecto, incidental, especial o 
                consecuente que resulte del uso o la imposibilidad de usar nuestros servicios.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[#66DEDB] mb-3">9. Contacto</h2>
              <p className="text-sm leading-relaxed">
                Si tienes preguntas sobre estos términos y condiciones, puedes contactarnos en:
                <br />
                <a
                  href="mailto:contacto@mytanku.com"
                  className="text-[#73FFA2] hover:text-[#66DEDB] transition-colors"
                >
                  contacto@mytanku.com
                </a>
                <br />
                <a
                  href="tel:+573013363980"
                  className="text-[#73FFA2] hover:text-[#66DEDB] transition-colors"
                >
                  +57 301 3363980
                </a>
              </p>
            </section>

            <div className="pt-6 border-t border-gray-600">
              <p className="text-xs text-gray-400">
                Última actualización: {new Date().toLocaleDateString('es-ES', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Versión de la política: 1.0
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

