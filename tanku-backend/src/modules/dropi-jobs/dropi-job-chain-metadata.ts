/** Metadata de job ENRICH encadenado tras SYNC_STOCK */
export interface EnrichJobChainMetadata {
  chainSyncProduct?: boolean;
  parentSyncStockJobId?: string;
  source?: 'cron' | 'manual' | 'chain';
}

/** Metadata de job SYNC_PRODUCT encadenado tras ENRICH */
export interface SyncProductJobChainMetadata {
  chainedFromEnrichJobId?: string;
  parentSyncStockJobId?: string;
  source?: 'chain';
}

export function parseEnrichChainMetadata(raw: unknown): EnrichJobChainMetadata | null {
  if (raw == null || typeof raw !== 'object') return null;
  return raw as EnrichJobChainMetadata;
}
