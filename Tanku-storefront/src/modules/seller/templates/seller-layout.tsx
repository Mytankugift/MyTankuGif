"use client"
import React, { useEffect } from "react"
import { HttpTypes } from "@medusajs/types"
import Store from "../components/store"
import Request from "../components/request"
import { submitFormData } from "../actions/post-add-seller-request"
import { fetchSellerRequest } from "../actions/get-seller-request"
import RequestInPending from "../components/request-sent"
import RequestNeedsCorrection from "../components/request-to-correct"
import RequestRejected from "../components/rejected-request"
import { useStoreTanku } from "@lib/context/store-context"

interface SellerLayoutProps {
  customer: HttpTypes.StoreCustomer | null
  children: React.ReactNode
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
  store:string
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

const SellerLayout: React.FC<SellerLayoutProps> = ({ customer, children }) => {
  const [isSeller, setIsSeller] = React.useState<SellerRequest>()
  const { setStoreId } = useStoreTanku()
  const [showModal, setShowModal] = React.useState(false)

  const handleSubmit = (e: FormDataValues, files: formFiles) => {
    console.log(customer?.id)
    if (!customer || !customer?.id) return alert("No se encontro un usuario ")
    submitFormData(e, files, customer.id)
  }

  const handleCloseModal = () => {
    setShowModal(false)
  }
  useEffect(() => {
    if (!customer || !customer?.id) return alert("No se encontro un usuario ")
    fetchSellerRequest(customer.id).then((res) => {
      console.log(res)
      setIsSeller(res.dataSellerRequest)
      setStoreId(res.dataSellerRequest.store)
    })
  }, [])

  return (
    <div>
      {isSeller && Object.entries(isSeller).length === 0  || !isSeller?.store ? (
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
        <Store customer={customer}>{children}</Store>
      ) : isSeller?.status_id === "id_correction" ? (
        <RequestNeedsCorrection comment={isSeller.comment} />
      ) : (
        isSeller?.status_id === "id_reject" && (
          <RequestRejected comment={isSeller.comment} />
        )
      )}
    </div>
  )
}

export default SellerLayout
