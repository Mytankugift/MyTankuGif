"use client"
import React, { useEffect } from "react"
import { HttpTypes } from "@medusajs/types"
import Store from "../../../seller/components/store"
import Request from "../../../seller/components/request"
import { submitFormData } from "../../../seller/actions/post-add-seller-request"
import { fetchSellerRequest } from "../../../seller/actions/get-seller-request"
import RequestInPending from "../../../seller/components/request-sent"
import RequestNeedsCorrection from "../../../seller/components/request-to-correct"
import RequestRejected from "../../../seller/components/rejected-request"
import { useStoreTanku } from "@lib/context/store-context"
import { usePersonalInfo } from "@lib/context/personal-info-context"
import { retrieveCustomer } from "@lib/data/customer"

interface SellerPanelProps {
  onClose: () => void
}

export interface FormDataValues {
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
  termsAccepted: boolean
}

export interface formFiles {
  rutFile: File | null
  commerceFile: File | null
  idFile: File | null
}

interface SellerRequest {
  store: string
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  address: string
  city: string
  region: string
  country: string
  website: string
  social_media: string
  rutFile: string
  comment: string
  commerceFile: string
  idFile: string
  status_id: string
  created_at: string
  updated_at: string
}

const SellerPanel: React.FC<SellerPanelProps> = ({ onClose }) => {
  const [isSeller, setIsSeller] = React.useState<SellerRequest>()
  const { setStoreId } = useStoreTanku()
  const [showModal, setShowModal] = React.useState(false)
  const [customer, setCustomer] = React.useState<HttpTypes.StoreCustomer | null>(null)
  const [customerLoading, setCustomerLoading] = React.useState(true)

  const handleSubmit = (e: FormDataValues, files: formFiles) => {
  
    if (!customer || !customer?.id) return alert("No se encontro un usuario ")
    submitFormData(e, files, customer.id).then(() => {
      setShowModal(false)
    })
  }

  const handleCloseModal = () => {
    setShowModal(false)
  }

  useEffect(() => {
    const loadCustomerData = async () => {
      setCustomerLoading(true)
      try {
        const customerData = await retrieveCustomer()
        setCustomer(customerData)
        
        if (customerData?.id) {
          const sellerResponse = await fetchSellerRequest(customerData.id)
        
          setIsSeller(sellerResponse.dataSellerRequest)
          if (sellerResponse.dataSellerRequest?.store) {
            setStoreId(sellerResponse.dataSellerRequest.store)
          }
        }
      } catch (error) {
        console.error('Error loading customer or seller data:', error)
        setCustomer(null)
      } finally {
        setCustomerLoading(false)
      }
    }
    
    loadCustomerData()
  }, [])

  return (
    <div className="h-full flex flex-col relative">
      {/* Fixed Close Arrow Button */}
      <button
        onClick={onClose}
        className="fixed right-4 top-1/2 transform -translate-y-1/2 z-20 w-12 h-12 flex items-center justify-center"
      >
        <img
          src="/Flecha.png"
          alt="Cerrar"
          className="w-6 h-6 object-contain"
        />
      </button>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {customerLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#66DEDB]"></div>
          </div>
        ) : !customer ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-400">Error al cargar datos del usuario</p>
          </div>
        ) : isSeller && Object.entries(isSeller).length === 0 || !isSeller?.store ? (
          <Request
            customer={customer}
            onSubmit={handleSubmit}
            onCloseModal={handleCloseModal}
            showModal={showModal}
            setShowModal={setShowModal}
          />
        ) : isSeller?.status_id === "id_pending" ? (
          <RequestInPending />
        ) : isSeller?.status_id === "id_accept" ? (
          <Store customer={customer}>
            <div className="p-3 sm:p-4 md:p-6">
              <h1 className="text-2xl font-bold text-[#66DEDB] mb-4">Panel de Vendedor</h1>
              <p className="text-gray-300">Bienvenido a tu tienda</p>
            </div>
          </Store>
        ) : isSeller?.status_id === "id_correction" ? (
          <RequestNeedsCorrection comment={isSeller.comment} />
        ) : (
          isSeller?.status_id === "id_reject" && (
            <RequestRejected comment={isSeller.comment} />
          )
        )}
      </div>
    </div>
  )
}

export default SellerPanel