"use client"
import React, { useState } from "react"
import { HttpTypes } from "@medusajs/types"
import ProductForm from "../example-products"

interface RequestProps {
  customer: HttpTypes.StoreCustomer | null
  onSubmit: (data: any, files: any) => void
  onCloseModal: () => void
  showModal: boolean
  setShowModal: (show: boolean) => void
}
interface FormData {
  firstName: string
  lastName: string
  email: string
  documentId: string
  country: string
  region: string
  city: string
  address: string
  phone: string
  website: string
  socialMedia: string
}

const Request: React.FC<RequestProps> = ({
  customer,
  onSubmit,
  onCloseModal,
  showModal,
  setShowModal,
}) => {
  // Estado único para manejar los campos del formulario (excepto archivos)
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    documentId: "",
    country: "",
    region: "",
    city: "",
    address: "",
    phone: "",
    website: "",
    socialMedia: "",
    termsAccepted: false,
  })

  // Estados separados para los archivos
  const [rutFile, setRutFile] = useState<File | null>(null)
  const [commerceFile, setCommerceFile] = useState<File | null>(null)
  const [idFile, setIdFile] = useState<File | null>(null)

  // Estado para validación del formulario
  const [isFormValid, setIsFormValid] = useState(false)

  // Función para validar el formulario
  const validateForm = () => {
    const requiredFields = [
      'firstName', 'lastName', 'email', 'documentId', 'country', 
      'region', 'city', 'address', 'phone', 'website', 'socialMedia'
    ]
    
    // Verificar que todos los campos requeridos estén llenos
    const allFieldsFilled = requiredFields.every(field => 
      formData[field as keyof typeof formData].toString().trim() !== ''
    )
    
    // Verificar que todos los archivos estén subidos
    const allFilesUploaded = rutFile !== null && commerceFile !== null && idFile !== null
    
    // Verificar que los términos estén aceptados
    const termsAccepted = formData.termsAccepted
    
    return allFieldsFilled && allFilesUploaded && termsAccepted
  }

  // Función para manejar cambios en los inputs (excepto archivos)
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target

    let updatedFormData
    if (type === "checkbox") {
      updatedFormData = {
        ...formData,
        [name]: checked,
      }
    } else {
      updatedFormData = {
        ...formData,
        [name]: value,
      }
    }
    
    setFormData(updatedFormData)
    
    // Validar formulario después de cada cambio
    setTimeout(() => {
      setIsFormValid(validateForm())
    }, 0)
  }

  // Función para manejar cambios en los archivos
  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setFile: (file: File | null) => void
  ) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    } else {
      setFile(null)
    }
    
    // Validar formulario después de cambio de archivo
    setTimeout(() => {
      setIsFormValid(validateForm())
    }, 0)
  }

  // Función para manejar el envío del formulario
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Crear un objeto con los datos del formulario y los archivos
    const data = {
      ...formData,
    }

    // Llamar a la función onSubmit pasada como prop
    onSubmit(data, { rutFile, commerceFile, idFile })
   

    // Cerrar el modal después de enviar
    
  }

  return (
    <div className="flex-1 h-[90vh]" data-testid="account-page">
      <div className="flex flex-col items-center justify-center h-full">
        <div className="text-center max-w-5xl">
          <h1 className="text-3xl font-bold mb-6 text-[#66DEDB]">
            ¡Bienvenido a Tanku Marketplace!
          </h1>
          <p className="text-lg text-white">
            Nos encantaría que formes parte de nuestro equipo y contribuyas a
            seguir construyendo una comunidad sólida y comprometida.
          </p>
          <p className="text-lg text-white">
            Para comenzar, debes solicitar ser vendedor y llenar unos datos que
            un administrador evaluará. Este proceso nos ayuda a garantizar que
            todos nuestros vendedores cumplan con los estándares de calidad y
            confianza que Tanku ofrece.
          </p>
          <p className="text-lg mb-6 text-white">
            ¡Estamos emocionados de tenerte aquí y esperamos que juntos logremos
            grandes cosas!
          </p>
        </div>
        <button
          className="px-6 py-3 bg-[#73FFA2] text-gray-900 rounded-lg font-medium hover:bg-[#66e891] transition-colors"
          onClick={() => setShowModal(true)}
        >
          Solicitar ser vendedor
        </button>

        {showModal && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
            <div className="bg-gray-800 border-2 border-[#3B9BC3] p-6 rounded-lg shadow-lg w-[90%] max-w-4xl mt-14 max-h-[80vh] overflow-y-auto">
              <h2 className="text-2xl font-bold mb-6 text-center text-[#66DEDB]">
                Solicitud para ser Vendedor
              </h2>
              <form className="grid grid-cols-2 gap-4">
                  {[
                    { label: "Primer Nombre", name: "firstName" },
                    { label: "Segundo Nombre", name: "lastName" },
                    { label: "Correo", name: "email", type: "email" },
                    { label: "Cédula o NIT", name: "documentId" },
                    { label: "País", name: "country" },
                    { label: "Región", name: "region" },
                    { label: "Ciudad", name: "city" },
                    { label: "Dirección", name: "address" },
                    { label: "Teléfono o Celular", name: "phone", type: "tel" },
                    { label: "Página Web", name: "website", type: "url" },
                    { label: "Redes Sociales", name: "socialMedia" },
                  ].map(({ label, name, type = "text" }) => (
                    <div key={name}>
                      <label className="block text-sm font-medium mb-2 text-white">
                        {label}
                      </label>
                      <input
                        type={type}
                        name={name}
                        className="w-full px-3 py-2 border border-[#3B9BC3] rounded-md bg-gray-700 text-white focus:border-[#73FFA2] focus:outline-none"
                        value={formData[name as keyof FormData]}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  ))}

                  {/* Input para el RUT */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2 text-white">
                      Subir RUT (PDF)
                    </label>
                    <input
                      type="file"
                      className="w-full px-3 py-2 border border-[#3B9BC3] rounded bg-gray-700 text-white file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-[#73FFA2] file:text-gray-900 hover:file:bg-[#66e891]"
                      accept=".pdf"
                      onChange={(e) => handleFileChange(e, setRutFile)}
                      required
                    />
                  </div>

                  {/* Input para la Cámara de Comercio */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2 text-white">
                      Subir Cámara de Comercio (PDF)
                    </label>
                    <input
                      type="file"
                      className="w-full px-3 py-2 border border-[#3B9BC3] rounded bg-gray-700 text-white file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-[#73FFA2] file:text-gray-900 hover:file:bg-[#66e891]"
                      accept=".pdf"
                      onChange={(e) => handleFileChange(e, setCommerceFile)}
                      required
                    />
                  </div>

                  {/* Input para la Cédula al 150% */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2 text-white">
                      Subir Cédula al 150% (PDF)
                    </label>
                    <input
                      type="file"
                      className="w-full px-3 py-2 border border-[#3B9BC3] rounded bg-gray-700 text-white file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-[#73FFA2] file:text-gray-900 hover:file:bg-[#66e891]"
                      accept=".pdf"
                      onChange={(e) => handleFileChange(e, setIdFile)}
                      required
                    />
                  </div>

                  {/* Checkbox de Términos y Condiciones - spans both columns */}
                  <div className="col-span-2 mb-4">
                    <label className="flex items-center text-white">
                      <input
                        type="checkbox"
                        name="termsAccepted"
                        className="mr-2 accent-[#73FFA2]"
                        checked={formData.termsAccepted}
                        onChange={handleInputChange}
                        required
                      />
                      Acepto los términos y condiciones
                    </label>
                  </div>

                  {/* Botones de acción - spans both columns */}
                  <div className="col-span-2 flex justify-end gap-3">
                    <button
                      type="button"
                      className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors"
                      onClick={() => setShowModal(false)}
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={!isFormValid}
                      className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                        isFormValid
                          ? "bg-[#73FFA2] text-gray-900 hover:bg-[#66e891] cursor-pointer"
                          : "bg-gray-500 text-gray-300 cursor-not-allowed"
                      }`}
                    >
                      Enviar Solicitud
                    </button>
                  </div>
                </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Request
