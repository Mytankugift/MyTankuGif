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

  // Función para manejar cambios en los inputs (excepto archivos)
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target

    if (type === "checkbox") {
      setFormData({
        ...formData,
        [name]: checked,
      })
    } else {
      setFormData({
        ...formData,
        [name]: value,
      })
    }
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
    console.log(data)

    // Cerrar el modal después de enviar
    setShowModal(false)
  }

  return (
    <div className="flex-1 h-[90vh]" data-testid="account-page">
      <div className="flex flex-col items-center justify-center h-full">
        <div className="text-center max-w-5xl">
          <h1 className="text-3xl font-bold mb-6">
            ¡Bienvenido a Tanku Marketplace!
          </h1>
          <p className="text-lg">
            Nos encantaría que formes parte de nuestro equipo y contribuyas a
            seguir construyendo una comunidad sólida y comprometida.
          </p>
          <p className="text-lg">
            Para comenzar, debes solicitar ser vendedor y llenar unos datos que
            un administrador evaluará. Este proceso nos ayuda a garantizar que
            todos nuestros vendedores cumplan con los estándares de calidad y
            confianza que Tanku ofrece.
          </p>
          <p className="text-lg mb-6">
            ¡Estamos emocionados de tenerte aquí y esperamos que juntos logremos
            grandes cosas!
          </p>
        </div>
        <button
          className="px-4 py-2 bg-blue-500 text-white rounded"
          onClick={() => setShowModal(true)}
        >
          Solicitar ser vendedor
        </button>

        {showModal && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white flex p-6 rounded shadow-lg w-[90%]  mt-14 max-h-[80vh] overflow-y-auto">
              <div className="w-[60%]  bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-2xl font-bold mb-6 text-center">
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
                      <label className="block text-sm font-medium mb-2">
                        {label}
                      </label>
                      <input
                        type={type}
                        name={name}
                        className="w-full px-3 py-2 border rounded-md"
                        value={formData[name as keyof FormData]}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  ))}

                  {/* Input para el RUT */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">
                      Subir RUT (PDF)
                    </label>
                    <input
                      type="file"
                      className="w-full px-3 py-2 border rounded"
                      accept=".pdf"
                      onChange={(e) => handleFileChange(e, setRutFile)}
                      required
                    />
                  </div>

                  {/* Input para la Cámara de Comercio */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">
                      Subir Cámara de Comercio (PDF)
                    </label>
                    <input
                      type="file"
                      className="w-full px-3 py-2 border rounded"
                      accept=".pdf"
                      onChange={(e) => handleFileChange(e, setCommerceFile)}
                      required
                    />
                  </div>

                  {/* Input para la Cédula al 150% */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">
                      Subir Cédula al 150% (PDF)
                    </label>
                    <input
                      type="file"
                      className="w-full px-3 py-2 border rounded"
                      accept=".pdf"
                      onChange={(e) => handleFileChange(e, setIdFile)}
                      required
                    />
                  </div>
                </form>
              </div>
              <div className="w-[40%]">
                <ProductForm />

                {/* Checkbox de Términos y Condiciones */}
                <div className="mb-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="termsAccepted"
                      className="mr-2"
                      checked={formData.termsAccepted}
                      onChange={handleInputChange}
                      required
                    />
                    Acepto los términos y condiciones
                  </label>
                </div>

                {/* Botones de acción */}
                <div className="flex justify-end">
                  <button
                    type="button"
                    className="px-4 py-2 bg-gray-500 text-white rounded mr-2"
                    onClick={() => setShowModal(false)}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSubmit}
                    className="px-4 py-2 bg-blue-500 text-white rounded"
                  >
                    Enviar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Request
