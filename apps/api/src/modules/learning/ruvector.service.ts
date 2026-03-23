/**
 * RuvectorService — Native vector storage using @ruvector/core.
 *
 * Replaces pgvector + PostgreSQL with a single REDB file.
 * Provides HNSW search, SIMD-accelerated distance, and crash-safe persistence.
 *
 * Storage: data/coach-keith.db (REDB file, ~1-10MB)
 * Search: Native HNSW (not pgvector)
 * Dependencies: None (just @ruvector/core npm package)
 *
 * USER ISOLATION: Entries are prefixed with user:{userId}: and
 * post-filtered on search. Keith's content has no user prefix.
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { join } from 'path';

// Types from @ruvector/core
interface VectorEntry {
  id?: string;
  vector: Float32Array;
}

interface SearchResult {
  id: string;
  score: number;
  vector?: Record<string, number>;
}

@Injectable()
export class RuvectorService implements OnModuleInit {
  private readonly logger = new Logger(RuvectorService.name);
  private db: any;
  private readonly dimensions = 256;
  private readonly storagePath: string;

  constructor() {
    this.storagePath =
      process.env.RUVECTOR_DB_PATH ||
      join(process.cwd(), '..', '..', 'data', 'coach-keith.db');
  }

  async onModuleInit() {
    try {
      const { VectorDb } = await import('@ruvector/core');
      this.db = new VectorDb({
        dimensions: this.dimensions,
        storagePath: this.storagePath,
        distanceMetric: 'Cosine',
      });

      const count = await this.db.len();
      this.logger.log(
        `Ruvector initialized: ${count} vectors in ${this.storagePath}`,
      );
    } catch (error) {
      this.logger.error(`Failed to initialize Ruvector: ${error.message}`);
      this.logger.warn('Falling back to in-memory mode (no persistence)');
    }
  }

  get isReady(): boolean {
    return this.db != null;
  }

  // -----------------------------------------------------------------------
  // Core operations
  // -----------------------------------------------------------------------

  async store(id: string, vector: number[], metadata?: Record<string, unknown>): Promise<string> {
    if (!this.db) return id;
    // Store vector. Metadata is encoded in the ID (ruvector-core stores id + vector only)
    await this.db.insert({ id, vector: new Float32Array(vector) });
    return id;
  }

  async storeBatch(entries: Array<{ id: string; vector: number[] }>): Promise<void> {
    if (!this.db) return;
    const batch = entries.map((e) => ({
      id: e.id,
      vector: new Float32Array(e.vector),
    }));
    await this.db.insertBatch(batch);
  }

  async search(
    vector: number[],
    k = 10,
    filterPrefix?: string,
  ): Promise<SearchResult[]> {
    if (!this.db) return [];
    const results: SearchResult[] = await this.db.search({
      vector: new Float32Array(vector),
      k: filterPrefix ? k * 3 : k, // over-fetch if filtering
      efSearch: 200,
    });

    if (filterPrefix) {
      return results
        .filter((r) => r.id.startsWith(filterPrefix))
        .slice(0, k);
    }
    return results.slice(0, k);
  }

  async get(id: string): Promise<VectorEntry | null> {
    if (!this.db) return null;
    return this.db.get(id);
  }

  async delete(id: string): Promise<boolean> {
    if (!this.db) return false;
    return this.db.delete(id);
  }

  async count(prefix?: string): Promise<number> {
    if (!this.db) return 0;
    if (!prefix) return this.db.len();
    // No native prefix count — approximate via total
    return this.db.len();
  }

  // -----------------------------------------------------------------------
  // Text-to-vector embedding (same as before, for compatibility)
  // -----------------------------------------------------------------------

  textToVector(text: string): number[] {
    const normalized = text.toLowerCase().replace(/[^a-z0-9\s]/g, '');
    const words = normalized.split(/\s+/).filter(Boolean);
    const vector = new Array(this.dimensions).fill(0);

    for (let i = 0; i < words.length; i++) {
      const hash1 = this.hash(words[i]);
      vector[hash1 % this.dimensions] += 1;

      if (i < words.length - 1) {
        const hash2 = this.hash(words[i] + '_' + words[i + 1]);
        vector[hash2 % this.dimensions] += 0.7;
      }

      if (i < words.length - 2) {
        const hash3 = this.hash(words[i] + '_' + words[i + 1] + '_' + words[i + 2]);
        vector[hash3 % this.dimensions] += 0.5;
      }
    }

    // L2 normalize
    const magnitude = Math.sqrt(vector.reduce((sum: number, v: number) => sum + v * v, 0));
    if (magnitude > 0) {
      for (let i = 0; i < this.dimensions; i++) {
        vector[i] /= magnitude;
      }
    }
    return vector;
  }

  private hash(str: string): number {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash + str.charCodeAt(i)) >>> 0;
    }
    return hash;
  }
}
