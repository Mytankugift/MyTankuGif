'use client'

import { useState } from 'react'
import Link from 'next/link'

interface AccordionSectionProps {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}

function AccordionSection({ title, children, defaultOpen = false }: AccordionSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="border-b border-gray-600 last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-4 text-left hover:bg-gray-700/30 transition-colors rounded-lg px-2 -mx-2"
      >
        <h2 className="text-xl font-semibold text-[#66DEDB] pr-4" style={{ fontFamily: 'Poppins, sans-serif' }}>
          {title}
        </h2>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`text-[#73FFA2] transition-transform duration-200 flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {isOpen && (
        <div className="pb-4 pt-2 px-2">
          {children}
        </div>
      )}
    </div>
  )
}

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

        <div className="space-y-8">
          {/* Términos y Condiciones */}
          <div className="bg-[#2D3A3A] border-2 border-[#73FFA2] rounded-2xl p-8 space-y-6">
            <div className="mb-6">
              <h1
                className="text-3xl font-bold text-[#73FFA2] mb-2"
                style={{ fontFamily: 'Poppins, sans-serif' }}
              >
                POLÍTICAS Y TÉRMINOS DE USO DE TANKU 2026
              </h1>
              <p className="text-[#66DEDB] text-lg" style={{ fontFamily: 'Poppins, sans-serif' }}>
                ¡Bienvenidos a TANKU! Don't give us a Like, Give a TANKU.
              </p>
            </div>

            <div className="space-y-2 text-gray-300" style={{ fontFamily: 'Poppins, sans-serif' }}>
              <div className="mb-6 space-y-3 pb-4 border-b border-gray-600">
                <p className="text-sm leading-relaxed">
                  Estos son los términos y condiciones para el acceso y uso de los servicios (en adelante "Los Servicios") ofrecidos dentro de la plataforma <a href="https://www.mytanku.com" className="text-[#73FFA2] hover:text-[#66DEDB] transition-colors" target="_blank" rel="noopener noreferrer">www.mytanku.com</a>, la cual incluye sus versiones para aplicaciones en dispositivos móviles (en adelante "la Plataforma").
                </p>
                <p className="text-sm leading-relaxed">
                  Estas condiciones generales de uso constituyen un acuerdo legalmente vinculante entre el Usuario (quien accede y usa la Plataforma y sus Servicios) y TANKU, desde el momento en que se acceda a la Plataforma.
                </p>
                <p className="text-sm leading-relaxed">
                  En caso de que el Usuario no acepte estos términos y condiciones, deberá abstenerse de acceder o usar la Plataforma y sus Servicios.
                </p>
              </div>

              <AccordionSection title="1. Capacidad de los Usuarios">
                <p className="text-sm leading-relaxed">
                  Para poder acceder a la Plataforma y sus Servicios, el Usuario debe contar con la capacidad legal para contratar, conforme a lo establecido en la legislación colombiana. Quien no cuente con la capacidad para contratar deberá abstenerse de usar la Plataforma y sus Servicios. En caso de que el Usuario sea una persona jurídica, debe contar con la capacidad para contratar en nombre y representación de dicha entidad.
                </p>
              </AccordionSection>

              <AccordionSection title="2. Registro y Tratamiento de Datos Personales">
                <p className="text-sm leading-relaxed mb-3">
                  El uso de la Plataforma requiere que el Usuario se registre y proporcione información veraz, precisa y actualizada.
                </p>
                <p className="text-sm leading-relaxed mb-3">
                  Los datos personales serán tratados conforme a la Ley 1581 de 2012, el Decreto 1377 de 2013 y demás normas complementarias que regulan la protección de datos personales en Colombia. Al proporcionar sus datos, el Usuario otorga su consentimiento previo, expreso e informado para el tratamiento de estos conforme a la Política de Privacidad de Datos publicada en la Plataforma.
                </p>
                <div className="ml-4 space-y-2">
                  <h3 className="text-lg font-semibold text-[#73FFA2] mb-2">Derechos del Titular de los Datos</h3>
                  <p className="text-sm leading-relaxed mb-2">El Usuario, como titular de sus datos personales, tiene derecho a:</p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Acceder, actualizar y rectificar su información personal.</li>
                    <li>Solicitar la eliminación de sus datos cuando no exista una obligación legal o contractual que impida su supresión.</li>
                    <li>Revocar la autorización para el tratamiento de sus datos.</li>
                    <li>Presentar quejas ante la Superintendencia de Industria y Comercio (SIC) en caso de incumplimiento de las normativas de protección de datos.</li>
                  </ul>
                  <p className="text-sm leading-relaxed mt-3">
                    Para ejercer estos derechos, el Usuario podrá enviar una solicitud al correo{' '}
                    <a href="mailto:contacto@mytanku.com" className="text-[#73FFA2] hover:text-[#66DEDB] transition-colors">
                      contacto@mytanku.com
                    </a>.
                  </p>
                  <h3 className="text-lg font-semibold text-[#73FFA2] mt-4 mb-2">Medidas de Seguridad</h3>
                  <p className="text-sm leading-relaxed">
                    TANKU implementa medidas técnicas, organizativas y jurídicas adecuadas para proteger la información personal de los Usuarios contra acceso no autorizado, pérdida o alteración, conforme a los principios de seguridad establecidos en la normativa vigente.
                  </p>
                </div>
              </AccordionSection>

              <AccordionSection title="3. Política de Cookies">
                <div className="ml-4 space-y-3">
                  <h3 className="text-lg font-semibold text-[#73FFA2] mb-2">Uso de Cookies y Tecnologías Similares</h3>
                  <p className="text-sm leading-relaxed">
                    TANKU utiliza cookies y tecnologías similares para mejorar la experiencia del Usuario, personalizar el contenido, analizar tendencias y administrar la Plataforma. Las cookies permiten almacenar información en los dispositivos del Usuario con el fin de optimizar el acceso y navegación en la Plataforma.
                  </p>
                  <h3 className="text-lg font-semibold text-[#73FFA2] mt-4 mb-2">Tipos de Cookies Utilizadas</h3>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li><strong>Cookies esenciales:</strong> Necesarias para el funcionamiento de la Plataforma y la prestación de los Servicios.</li>
                    <li><strong>Cookies de rendimiento:</strong> Ayudan a mejorar el rendimiento y experiencia del Usuario.</li>
                    <li><strong>Cookies de análisis y estadísticas:</strong> Permiten analizar el comportamiento del Usuario y optimizar la Plataforma.</li>
                    <li><strong>Cookies de publicidad:</strong> Utilizadas para ofrecer contenido publicitario relevante basado en los intereses del Usuario.</li>
                  </ul>
                  <h3 className="text-lg font-semibold text-[#73FFA2] mt-4 mb-2">Gestión de Cookies</h3>
                  <p className="text-sm leading-relaxed">
                    El Usuario puede configurar el uso de cookies a través de las opciones de su navegador y rechazar o eliminar aquellas que no sean esenciales. Sin embargo, la desactivación de ciertas cookies podría afectar la funcionalidad de la Plataforma.
                  </p>
                  <h3 className="text-lg font-semibold text-[#73FFA2] mt-4 mb-2">Normativa Aplicable</h3>
                  <p className="text-sm leading-relaxed mb-2">TANKU cumple con la normativa colombiana vigente en materia de protección de datos y privacidad, incluyendo:</p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Ley 1581 de 2012 (Protección de Datos Personales)</li>
                    <li>Decreto 1377 de 2013 (Reglamentación de la Ley 1581 de 2012)</li>
                    <li>Ley 527 de 1999 (Regulación del comercio electrónico y mensajes de datos)</li>
                    <li>Directrices de la Superintendencia de Industria y Comercio (SIC) sobre el uso de cookies y tecnologías de seguimiento.</li>
                  </ul>
                  <p className="text-sm leading-relaxed mt-3">
                    Para más información sobre el uso de cookies, el Usuario puede contactar a{' '}
                    <a href="mailto:contacto@mytanku.com" className="text-[#73FFA2] hover:text-[#66DEDB] transition-colors">
                      contacto@mytanku.com
                    </a>.
                  </p>
                </div>
              </AccordionSection>

              <AccordionSection title="4. Cuentas de los Usuarios">
                <p className="text-sm leading-relaxed">
                  El Usuario es responsable de la confidencialidad de su cuenta y contraseña. TANKU no será responsable por el uso indebido de la cuenta, incluidas pérdidas derivadas del acceso no autorizado. En caso de uso no autorizado, el Usuario deberá notificar a TANKU de inmediato.
                </p>
                <p className="text-sm leading-relaxed mt-2">
                  TANKU podrá suspender o cancelar la cuenta del Usuario en caso de uso indebido, fraude o incumplimiento de estos términos y condiciones.
                </p>
              </AccordionSection>

              <AccordionSection title="5. Servicios">
                <p className="text-sm leading-relaxed mb-3">TANKU ofrece los siguientes servicios a través de su Plataforma:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li><strong>#FAST GIFT:</strong> Permite enviar un regalo seleccionándolo de una base de datos dentro de la Plataforma.</li>
                  <li><strong>#UNIVERSAL GIFT:</strong> Envío de regalos a nivel global sin sobrecostos adicionales.</li>
                  <li><strong>#GIFT FOR ME:</strong> Servicio para autogestionar y enviarse regalos a sí mismo.</li>
                  <li><strong>#STALKER GIFT:</strong> Permite enviar regalos en modo anónimo, donde el receptor decide si los acepta sin revelar su identidad.</li>
                  <li><strong>#DREAM HELPER:</strong> Plataforma de donaciones para causas benéficas.</li>
                  <li><strong>#MOMENTOS TANKU:</strong> Regalos grupales para eventos especiales.</li>
                </ul>
              </AccordionSection>

              <AccordionSection title="6. Productos y Responsabilidad">
                <p className="text-sm leading-relaxed">
                  Los productos y servicios ofrecidos en la Plataforma son comercializados por terceros, quienes son responsables de su calidad, idoneidad y garantía, conforme a la Ley 1480 de 2011 (Estatuto del Consumidor).
                </p>
                <p className="text-sm leading-relaxed mt-2">
                  TANKU no fabrica, importa ni almacena los productos ofertados, por lo que cualquier reclamación sobre garantía o calidad debe dirigirse directamente al proveedor del producto.
                </p>
              </AccordionSection>

              <AccordionSection title="7. Garantía de los Productos y Servicios">
                <p className="text-sm leading-relaxed">
                  Los proveedores son responsables de garantizar los productos y servicios según lo dispuesto en la ley. Si no se especifica un término de garantía, se aplicará el período de un (1) año para productos nuevos, contado desde la entrega al consumidor.
                </p>
              </AccordionSection>

              <AccordionSection title="8. Limitación de Responsabilidad">
                <p className="text-sm leading-relaxed mb-2">TANKU no asume responsabilidad por:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Daños o pérdidas sufridas por el Usuario derivadas de fallos en los productos o servicios ofertados por terceros.</li>
                  <li>Lucro cesante o daños emergentes derivados de fallas en la Plataforma.</li>
                  <li>Inexactitudes en la información suministrada por proveedores.</li>
                </ul>
                <p className="text-sm leading-relaxed mt-3">
                  TANKU actúa únicamente como intermediario entre los Usuarios y los proveedores de productos y servicios.
                </p>
              </AccordionSection>

              <AccordionSection title="9. Jurisdicción y Ley Aplicable">
                <p className="text-sm leading-relaxed">
                  Estos términos se rigen por las leyes de la República de Colombia. Cualquier controversia será resuelta ante los tribunales competentes de la ciudad de Bogotá.
                </p>
              </AccordionSection>

              <div className="pt-6 border-t border-gray-600 mt-6">
                <p className="text-sm leading-relaxed">
                  Al aceptar estos términos, el Usuario declara haber leído y entendido todas las condiciones aquí establecidas y estar de acuerdo con ellas.
                </p>
              </div>
            </div>
          </div>

          {/* Política de Privacidad y Tratamiento de Datos */}
          <div className="bg-[#2D3A3A] border-2 border-[#73FFA2] rounded-2xl p-8 space-y-6">
            <div className="mb-6">
              <h1
                className="text-3xl font-bold text-[#73FFA2] mb-2"
                style={{ fontFamily: 'Poppins, sans-serif' }}
              >
                POLÍTICA DE PRIVACIDAD Y TRATAMIENTO DE DATOS DE TANKU 2026
              </h1>
              <p className="text-[#66DEDB] text-lg" style={{ fontFamily: 'Poppins, sans-serif' }}>
                ¡Bienvenidos a TANKU! Don't give us a Like, Give a TANKU.
              </p>
            </div>

            <div className="space-y-2 text-gray-300" style={{ fontFamily: 'Poppins, sans-serif' }}>
              <div className="mb-6 space-y-3 pb-4 border-b border-gray-600">
                <p className="text-sm leading-relaxed">
                  En TANKU, valoramos y protegemos la privacidad de nuestros usuarios. Esta política describe cómo recopilamos, utilizamos, almacenamos y, en ocasiones, divulgamos la información personal de nuestros usuarios, en cumplimiento con la legislación colombiana vigente en materia de protección de datos personales.
                </p>
                <p className="text-sm leading-relaxed">
                  Al acceder y utilizar nuestra plataforma www.mytanku.com, incluyendo sus versiones para dispositivos móviles (en adelante, "la Plataforma"), usted acepta las prácticas descritas en esta política. Si no está de acuerdo con estos términos, le solicitamos abstenerse de utilizar la Plataforma y sus servicios.
                </p>
              </div>

              <AccordionSection title="1. Definiciones">
                <p className="text-sm leading-relaxed mb-3">
                  Para una comprensión clara de esta política, se adoptan las siguientes definiciones conforme a la Ley 1581 de 2012 y el Decreto 1377 de 2013:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li><strong>Dato Personal:</strong> Información vinculada o que pueda asociarse a una o varias personas naturales determinadas o determinables.</li>
                  <li><strong>Dato Sensible:</strong> Información que afecta la intimidad del titular o cuyo uso indebido puede generar discriminación, como datos que revelen origen racial, orientación política, convicciones religiosas, entre otros.</li>
                  <li><strong>Tratamiento:</strong> Cualquier operación sobre datos personales, como recolección, almacenamiento, uso, circulación o supresión.</li>
                  <li><strong>Responsable del Tratamiento:</strong> Persona natural o jurídica que decide sobre la base de datos y/o el tratamiento de los datos.</li>
                  <li><strong>Encargado del Tratamiento:</strong> Persona natural o jurídica que realiza el tratamiento de datos personales por cuenta del responsable.</li>
                  <li><strong>Titular:</strong> Persona natural cuyos datos personales son objeto de tratamiento.</li>
                  <li><strong>Autorización:</strong> Consentimiento previo, expreso e informado del titular para llevar a cabo el tratamiento de datos personales.</li>
                </ul>
              </AccordionSection>

              <AccordionSection title="2. Recolección y Uso de Datos Personales">
                <div className="ml-4 space-y-3">
                  <h3 className="text-lg font-semibold text-[#73FFA2] mb-2">2.1. Información Recopilada</h3>
                  <p className="text-sm leading-relaxed mb-2">Al registrarse en nuestra Plataforma, podemos recopilar los siguientes datos personales:</p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Nombres y apellidos</li>
                    <li>Correo electrónico</li>
                    <li>Número(s) de teléfono</li>
                    <li>Dirección de envío</li>
                    <li>Información de perfil, como listas de intereses, fechas de eventos especiales, listas de contactos y fotografías de perfil</li>
                  </ul>
                  <h3 className="text-lg font-semibold text-[#73FFA2] mt-4 mb-2">2.2. Finalidad del Tratamiento</h3>
                  <p className="text-sm leading-relaxed mb-2">Los datos personales recopilados serán utilizados para:</p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Proveer los servicios ofrecidos en la Plataforma.</li>
                    <li>Informar sobre cambios, promociones, eventos especiales o celebraciones.</li>
                    <li>Desarrollar actividades de publicidad, mercadeo o promocionales.</li>
                    <li>Enviar información relacionada con productos y servicios de la Plataforma.</li>
                    <li>Realizar evaluaciones y estudios para mejorar la calidad de nuestros servicios.</li>
                    <li>Cumplir con obligaciones legales y contractuales.</li>
                  </ul>
                </div>
              </AccordionSection>

              <AccordionSection title="3. Autorización y Consentimiento">
                <p className="text-sm leading-relaxed">
                  De acuerdo con la Ley 1581 de 2012, el tratamiento de datos personales requiere el consentimiento previo, expreso e informado del titular. Al proporcionar sus datos en la Plataforma, usted otorga dicha autorización para los fines aquí descritos.
                </p>
              </AccordionSection>

              <AccordionSection title="4. Derechos de los Titulares">
                <p className="text-sm leading-relaxed mb-3">
                  Conforme a la Ley 1581 de 2012, los titulares de los datos personales tienen los siguientes derechos:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li><strong>Acceso:</strong> Conocer los datos personales que están siendo tratados.</li>
                  <li><strong>Actualización y Rectificación:</strong> Solicitar la actualización o corrección de sus datos.</li>
                  <li><strong>Supresión:</strong> Solicitar la eliminación de sus datos cuando sea procedente.</li>
                  <li><strong>Revocación de la Autorización:</strong> Retirar el consentimiento otorgado para el tratamiento de sus datos.</li>
                  <li><strong>Quejas:</strong> Presentar quejas ante la Superintendencia de Industria y Comercio (SIC) por infracciones a la ley.</li>
                </ul>
                <p className="text-sm leading-relaxed mt-3">
                  Para ejercer estos derechos, puede contactarnos en{' '}
                  <a href="mailto:contacto@mytanku.com" className="text-[#73FFA2] hover:text-[#66DEDB] transition-colors">
                    contacto@mytanku.com
                  </a>.
                </p>
              </AccordionSection>

              <AccordionSection title="5. Seguridad de la Información">
                <p className="text-sm leading-relaxed">
                  Implementamos medidas técnicas, humanas y administrativas necesarias para proteger sus datos personales contra acceso no autorizado, pérdida, alteración o uso indebido, en cumplimiento con el Decreto 1377 de 2013.
                </p>
              </AccordionSection>

              <AccordionSection title="6. Transferencia y Transmisión de Datos">
                <p className="text-sm leading-relaxed">
                  Sus datos personales podrán ser compartidos con terceros, como proveedores y contratistas, únicamente para los fines establecidos en esta política y bajo estrictas medidas de confidencialidad y seguridad, conforme a la Ley 1581 de 2012.
                </p>
              </AccordionSection>

              <AccordionSection title="7. Uso de Cookies">
                <p className="text-sm leading-relaxed">
                  La Plataforma utiliza cookies para mejorar la experiencia del usuario. Las cookies son archivos de texto que se almacenan en su dispositivo para recordar sus preferencias y facilitar la navegación. Puede configurar su navegador para rechazar las cookies; sin embargo, esto puede afectar el funcionamiento óptimo de la Plataforma.
                </p>
              </AccordionSection>

              <AccordionSection title="8. Modificaciones a la Política de Privacidad">
                <p className="text-sm leading-relaxed">
                  TANKU se reserva el derecho de modificar esta política en cualquier momento. Cualquier cambio será informado a través de la Plataforma. El uso continuado de la Plataforma después de la publicación de modificaciones constituye la aceptación de las mismas.
                </p>
              </AccordionSection>

              <AccordionSection title="9. Contacto">
                <p className="text-sm leading-relaxed mb-2">
                  Para consultas, solicitudes o reclamos relacionados con sus datos personales, puede comunicarse con nosotros en:
                </p>
                <ul className="list-none space-y-2 ml-4">
                  <li>
                    <strong className="text-[#73FFA2]">Correo electrónico:</strong>{' '}
                    <a href="mailto:contacto@mytanku.com" className="text-[#73FFA2] hover:text-[#66DEDB] transition-colors">
                      contacto@mytanku.com
                    </a>
                  </li>
                  <li>
                    <strong className="text-[#73FFA2]">Número de contacto:</strong> +57 301 336 3980
                  </li>
                  <li>
                    <strong className="text-[#73FFA2]">Dirección:</strong> Carrera 22 No. 86a-01, piso 2, Bogotá, D.C., Colombia
                  </li>
                </ul>
              </AccordionSection>

              <div className="pt-6 border-t border-gray-600 mt-6">
                <p className="text-sm leading-relaxed">
                  Al utilizar nuestra Plataforma, usted reconoce que ha leído, comprendido y aceptado esta Política de Privacidad y Tratamiento de Datos de TANKU.
                </p>
              </div>
            </div>
          </div>

          {/* Footer con información de versión */}
          <div className="text-center py-4">
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
  )
}
