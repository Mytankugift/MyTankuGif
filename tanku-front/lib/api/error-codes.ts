/** Códigos de error alineados con `tanku-backend` `ErrorCode` */

import type { ProductDTO } from '@/types/api'

export const API_ERROR_CODE = {
  AGE_RESTRICTED: 'AGE_RESTRICTED',
} as const

export type ApiErrorWithCode = Error & { code?: string; teaser?: ProductDTO }

export function createApiError(message: string, code?: string, teaser?: ProductDTO): ApiErrorWithCode {
  const e = new Error(message) as ApiErrorWithCode
  e.code = code
  if (teaser !== undefined) e.teaser = teaser
  return e
}

export function getApiErrorCode(error: unknown): string | undefined {
  if (error && typeof error === 'object' && 'code' in error) {
    const c = (error as { code?: unknown }).code
    return typeof c === 'string' ? c : undefined
  }
  return undefined
}

export function isAgeRestrictedApiError(error: unknown): boolean {
  return getApiErrorCode(error) === API_ERROR_CODE.AGE_RESTRICTED
}
