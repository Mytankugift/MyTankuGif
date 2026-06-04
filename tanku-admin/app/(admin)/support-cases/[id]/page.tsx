'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

/** Redirige rutas antiguas al layout maestro-detalle con ?case= */
export default function SupportCaseDetailRedirectPage() {
  const params = useParams()
  const router = useRouter()
  const caseId = params.id as string

  useEffect(() => {
    if (caseId) {
      router.replace(`/support-cases?case=${encodeURIComponent(caseId)}`)
    }
  }, [caseId, router])

  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
    </div>
  )
}
