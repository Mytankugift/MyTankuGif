/** Resumen persistido al finalizar job ENRICH */
export interface EnrichJobResultMetadata {
  enriched: number
  errors: number
}

/** Resumen persistido al finalizar job SYNC_PRODUCT (propagar a Tanku) */
export interface SyncProductJobResultMetadata {
  productsCreated: number
  productsUpdated: number
  productsIncludedWithStock: number
  productsExcludedNoStock: number
}
