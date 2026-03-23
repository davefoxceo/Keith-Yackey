/**
 * RuvectorClient - Main client for Coach Keith AI's vector database.
 *
 * Wraps the ruvector npm library to provide a typed, domain-specific interface
 * for storing embeddings, running semantic search, and feeding learning signals
 * back through the SONA self-learning engine.
 */

import type { VectorEntry, SearchQuery, SearchResult } from '@ruvector/core';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RuvectorClientConfig {
  /** Embedding dimension used across all collections (default: 384 for MiniLM). */
  dimensions: number;
  /** Directory for on-disk persistence (optional, in-memory if omitted). */
  storagePath?: string;
  /** SONA hidden dimension for the self-learning engine (default: 256). */
  sonaHiddenDim: number;
  /** SONA configuration overrides. */
  sonaConfig?: SonaConfigOverrides;
}

export interface SonaConfigOverrides {
  microLoraRank?: number;
  baseLoraRank?: number;
  microLoraLr?: number;
  baseLoraLr?: number;
  ewcLambda?: number;
  patternClusters?: number;
  trajectoryCapacity?: number;
  backgroundIntervalMs?: number;
  qualityThreshold?: number;
}

export interface CollectionHandle {
  name: string;
  dimensions: number;
  insert(entry: VectorEntry): Promise<string>;
  insertBatch(entries: VectorEntry[]): Promise<string[]>;
  search(query: SearchQuery): Promise<SearchResult[]>;
  delete(id: string): Promise<boolean>;
  get(id: string): Promise<VectorEntry | null>;
  len(): Promise<number>;
}

/** Names of the built-in collections managed by the client. */
export type CollectionName =
  | 'coaching_chunks'
  | 'conversation_history'
  | 'user_embeddings'
  | 'learning_signals';

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

export class RuvectorClient {
  private readonly config: Required<RuvectorClientConfig>;
  private collections = new Map<CollectionName, CollectionHandle>();
  private initialized = false;

  // Lazily-resolved modules -- keeps startup fast when native binaries
  // are not yet installed.
  private _VectorDb: typeof import('@ruvector/core').VectorDb | null = null;
  private _SonaEngine: (typeof import('ruvector'))['Sona']['Engine'] | null = null;
  private _sonaInstance: InstanceType<NonNullable<typeof this._SonaEngine>> | null = null;

  constructor(config: Partial<RuvectorClientConfig> = {}) {
    this.config = {
      dimensions: config.dimensions ?? 384,
      storagePath: config.storagePath ?? '',
      sonaHiddenDim: config.sonaHiddenDim ?? 256,
      sonaConfig: config.sonaConfig ?? {},
    };
  }

  // -----------------------------------------------------------------------
  // Lifecycle
  // -----------------------------------------------------------------------

  /**
   * Initialize the client: load native modules, create collections, and
   * start the SONA engine.  This MUST be called before any other method.
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Resolve native @ruvector/core
    const coreModule = await import('@ruvector/core');
    this._VectorDb = coreModule.VectorDb ?? (coreModule as Record<string, unknown>).VectorDB as typeof coreModule.VectorDb;

    // Create the four domain collections
    const collectionNames: CollectionName[] = [
      'coaching_chunks',
      'conversation_history',
      'user_embeddings',
      'learning_signals',
    ];

    for (const name of collectionNames) {
      const storagePath = this.config.storagePath
        ? `${this.config.storagePath}/${name}`
        : undefined;

      const db = new this._VectorDb({
        dimensions: this.config.dimensions,
        storagePath,
        distanceMetric: 'cosine',
      });

      this.collections.set(name, {
        name,
        dimensions: this.config.dimensions,
        insert: (entry: VectorEntry) => db.insert(entry),
        insertBatch: (entries: VectorEntry[]) => db.insertBatch(entries),
        search: (query: SearchQuery) => db.search(query),
        delete: (id: string) => db.delete(id),
        get: (id: string) => db.get(id),
        len: () => db.len(),
      });
    }

    // Attempt to start SONA (optional -- gracefully degrades)
    try {
      const ruvectorModule = await import('ruvector');
      const Sona = ruvectorModule.Sona ?? (ruvectorModule as Record<string, unknown>).default?.Sona;

      if (Sona?.isAvailable?.()) {
        const overrides = this.config.sonaConfig ?? {};
        this._SonaEngine = Sona.Engine;
        this._sonaInstance = Sona.Engine.withConfig({
          hiddenDim: this.config.sonaHiddenDim,
          ...overrides,
        });
      }
    } catch {
      // SONA is optional -- the client works without it.
    }

    this.initialized = true;
  }

  // -----------------------------------------------------------------------
  // Collection access
  // -----------------------------------------------------------------------

  /** Get a collection handle by name. Throws if the client is not initialized. */
  getCollection(name: CollectionName): CollectionHandle {
    this.assertInitialized();
    const col = this.collections.get(name);
    if (!col) throw new Error(`Collection "${name}" not found.`);
    return col;
  }

  // -----------------------------------------------------------------------
  // Vector operations (convenience wrappers)
  // -----------------------------------------------------------------------

  /** Store a vector in the given collection. */
  async store(
    collection: CollectionName,
    entry: VectorEntry,
  ): Promise<string> {
    return this.getCollection(collection).insert(entry);
  }

  /** Store a batch of vectors. */
  async storeBatch(
    collection: CollectionName,
    entries: VectorEntry[],
  ): Promise<string[]> {
    return this.getCollection(collection).insertBatch(entries);
  }

  /** Semantic search against a collection. */
  async search(
    collection: CollectionName,
    vector: number[] | Float32Array,
    k: number,
    efSearch?: number,
  ): Promise<SearchResult[]> {
    return this.getCollection(collection).search({ vector, k, efSearch });
  }

  /** Update a vector by delete + re-insert (atomic swap is not supported by the engine). */
  async update(
    collection: CollectionName,
    id: string,
    entry: VectorEntry,
  ): Promise<string> {
    const col = this.getCollection(collection);
    await col.delete(id);
    return col.insert({ ...entry, id });
  }

  /** Delete a vector from a collection. */
  async remove(collection: CollectionName, id: string): Promise<boolean> {
    return this.getCollection(collection).delete(id);
  }

  // -----------------------------------------------------------------------
  // SONA integration
  // -----------------------------------------------------------------------

  /** Whether the SONA self-learning engine is available. */
  get sonaAvailable(): boolean {
    return this._sonaInstance !== null;
  }

  /** Access the raw SONA engine (for advanced use). Returns null if unavailable. */
  get sona() {
    return this._sonaInstance;
  }

  // -----------------------------------------------------------------------
  // Internals
  // -----------------------------------------------------------------------

  private assertInitialized(): void {
    if (!this.initialized) {
      throw new Error(
        'RuvectorClient is not initialized. Call await client.initialize() first.',
      );
    }
  }

  /** Shut down the client. Flushes SONA state if active. */
  async shutdown(): Promise<void> {
    if (this._sonaInstance) {
      this._sonaInstance.flush();
    }
    this.collections.clear();
    this.initialized = false;
  }
}
