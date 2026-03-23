/**
 * Stub type declarations for @ruvector/core.
 * The actual native module is optional — the client degrades gracefully.
 */
declare module '@ruvector/core' {
  export interface VectorEntry {
    id: string;
    vector: Float32Array | number[];
    metadata?: Record<string, unknown>;
  }

  export interface SearchQuery {
    vector: Float32Array | number[];
    k: number;
    efSearch?: number;
  }

  export interface SearchResult {
    id: string;
    score: number;
    vector?: Float32Array;
    metadata?: Record<string, unknown>;
  }

  export interface VectorDbConfig {
    dimensions: number;
    storagePath?: string;
    distanceMetric?: 'cosine' | 'euclidean' | 'dot';
  }

  export class VectorDb {
    constructor(config: VectorDbConfig);
    insert(entry: VectorEntry): Promise<string>;
    insertBatch(entries: VectorEntry[]): Promise<string[]>;
    search(query: SearchQuery): Promise<SearchResult[]>;
    delete(id: string): Promise<boolean>;
    get(id: string): Promise<VectorEntry | null>;
    len(): Promise<number>;
  }
}
