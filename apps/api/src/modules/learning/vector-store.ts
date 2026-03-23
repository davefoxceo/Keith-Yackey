/**
 * In-memory vector store with cosine similarity search.
 *
 * Pure-JS fallback when native ruvector binaries aren't available.
 * Provides the same semantic search capability for the demo with
 * user-scoped namespacing to ensure conversation data never leaks
 * between users.
 */

export interface VectorEntry {
  id: string;
  vector: number[];
  metadata: Record<string, unknown>;
}

export interface SearchResult {
  id: string;
  score: number;
  metadata: Record<string, unknown>;
}

export class InMemoryVectorStore {
  private entries = new Map<string, VectorEntry>();

  /** Store a vector entry. */
  store(entry: VectorEntry): void {
    this.entries.set(entry.id, entry);
  }

  /** Store multiple entries. */
  storeBatch(entries: VectorEntry[]): void {
    for (const entry of entries) {
      this.entries.set(entry.id, entry);
    }
  }

  /** Delete an entry by ID. */
  delete(id: string): boolean {
    return this.entries.delete(id);
  }

  /** Get an entry by ID. */
  get(id: string): VectorEntry | null {
    return this.entries.get(id) ?? null;
  }

  /** Count entries, optionally filtered by ID prefix. */
  count(prefix?: string): number {
    if (!prefix) return this.entries.size;
    let count = 0;
    for (const key of this.entries.keys()) {
      if (key.startsWith(prefix)) count++;
    }
    return count;
  }

  /**
   * Search for the k most similar vectors using cosine similarity.
   * Optionally filter by ID prefix (for user scoping).
   */
  search(
    queryVector: number[],
    k: number,
    filterPrefix?: string,
  ): SearchResult[] {
    const results: SearchResult[] = [];

    for (const [id, entry] of this.entries) {
      // Apply prefix filter for user isolation
      if (filterPrefix && !id.startsWith(filterPrefix)) continue;

      const score = cosineSimilarity(queryVector, entry.vector);
      results.push({ id, score, metadata: entry.metadata });
    }

    // Sort by score descending, return top k
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, k);
  }

  /** Get all entries matching a prefix. */
  getByPrefix(prefix: string): VectorEntry[] {
    const results: VectorEntry[] = [];
    for (const [id, entry] of this.entries) {
      if (id.startsWith(prefix)) results.push(entry);
    }
    return results;
  }
}

// ---------------------------------------------------------------------------
// Text-to-vector embedding (simple but effective for demo)
// ---------------------------------------------------------------------------

/**
 * Generate a deterministic embedding vector from text.
 *
 * Uses a bag-of-trigrams approach with hashing to produce a fixed-dimension
 * vector. This isn't as good as a real embedding model, but it captures
 * enough semantic signal for keyword/concept matching in the demo.
 */
export function textToVector(text: string, dimensions = 256): number[] {
  const normalized = text.toLowerCase().replace(/[^a-z0-9\s]/g, '');
  const words = normalized.split(/\s+/).filter(Boolean);
  const vector = new Array(dimensions).fill(0);

  // Hash each word and word-pair (bigram) into the vector
  for (let i = 0; i < words.length; i++) {
    // Unigrams
    const hash1 = simpleHash(words[i]);
    vector[hash1 % dimensions] += 1;

    // Bigrams (capture word relationships)
    if (i < words.length - 1) {
      const bigram = words[i] + '_' + words[i + 1];
      const hash2 = simpleHash(bigram);
      vector[hash2 % dimensions] += 0.7;
    }

    // Trigrams
    if (i < words.length - 2) {
      const trigram = words[i] + '_' + words[i + 1] + '_' + words[i + 2];
      const hash3 = simpleHash(trigram);
      vector[hash3 % dimensions] += 0.5;
    }
  }

  // L2 normalize
  const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
  if (magnitude > 0) {
    for (let i = 0; i < dimensions; i++) {
      vector[i] /= magnitude;
    }
  }

  return vector;
}

// ---------------------------------------------------------------------------
// Utility functions
// ---------------------------------------------------------------------------

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    magnitudeA += a[i] * a[i];
    magnitudeB += b[i] * b[i];
  }

  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);

  if (magnitudeA === 0 || magnitudeB === 0) return 0;
  return dotProduct / (magnitudeA * magnitudeB);
}

function simpleHash(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) >>> 0;
  }
  return hash;
}
