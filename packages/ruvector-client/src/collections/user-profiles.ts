/**
 * UserProfileStore - Vector store for user profile embeddings.
 *
 * Each user's profile -- dial scores, marriage context, conversation history
 * summary, engagement patterns -- is encoded as an embedding and stored here.
 * This enables:
 *
 *  - Finding users with similar situations (for accountability group matching).
 *  - Personalizing RAG retrieval by biasing toward content that helped users
 *    in comparable stages.
 *  - Tracking how a user's profile embedding drifts over time as they grow.
 */

import type { SearchResult } from '@ruvector/core';
import type { RuvectorClient, CollectionName } from '../client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UserProfileInput {
  /** User identifier. */
  userId: string;
  /** Pre-computed embedding that captures the user's current state. */
  embedding: number[];
  /** Optional metadata (not stored in the vector DB, for caller reference). */
  metadata?: Record<string, unknown>;
}

export interface SimilarUserResult {
  /** User identifier. */
  userId: string;
  /** Cosine similarity score. */
  similarity: number;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

const COLLECTION: CollectionName = 'user_embeddings';

export class UserProfileStore {
  private readonly client: RuvectorClient;

  constructor(client: RuvectorClient) {
    this.client = client;
  }

  // -----------------------------------------------------------------------
  // Write
  // -----------------------------------------------------------------------

  /**
   * Store (or overwrite) a user's profile embedding.
   *
   * If a profile already exists for this user it is replaced so that the
   * vector DB always holds the latest snapshot.
   */
  async storeUserProfile(profile: UserProfileInput): Promise<string> {
    // Attempt to remove any previous embedding for this user.  The delete
    // is best-effort -- it will no-op if the user is new.
    try {
      await this.client.remove(COLLECTION, profile.userId);
    } catch {
      // Ignored: user may not exist yet.
    }

    return this.client.store(COLLECTION, {
      id: profile.userId,
      vector: new Float32Array(profile.embedding),
    });
  }

  // -----------------------------------------------------------------------
  // Search
  // -----------------------------------------------------------------------

  /**
   * Find users whose profile embeddings are most similar to the given user.
   *
   * This is the basis for accountability group matching: users going
   * through similar marriage stages, with similar dial profiles, are
   * likely to benefit from supporting each other.
   *
   * @param userId      The user to find matches for.
   * @param limit       Maximum number of similar users to return.
   * @returns           Similar users sorted by descending similarity.
   */
  async findSimilarUsers(
    userId: string,
    limit = 5,
  ): Promise<SimilarUserResult[]> {
    // First, retrieve the user's own embedding.
    const entry = await this.client.getCollection(COLLECTION).get(userId);
    if (!entry) {
      throw new Error(`No profile embedding found for user "${userId}".`);
    }

    // Search for similar vectors.  Request one extra because the user's
    // own vector will appear in the results.
    const results: SearchResult[] = await this.client.search(
      COLLECTION,
      entry.vector,
      limit + 1,
    );

    return results
      .filter((r) => r.id !== userId)
      .slice(0, limit)
      .map((r) => ({ userId: r.id, similarity: r.score }));
  }

  /**
   * Find users similar to an arbitrary embedding (e.g. a target profile
   * for a new accountability group).
   */
  async findSimilarByEmbedding(
    embedding: number[],
    limit = 5,
  ): Promise<SimilarUserResult[]> {
    const results: SearchResult[] = await this.client.search(
      COLLECTION,
      embedding,
      limit,
    );

    return results.map((r) => ({ userId: r.id, similarity: r.score }));
  }

  // -----------------------------------------------------------------------
  // Update
  // -----------------------------------------------------------------------

  /**
   * Update a user's profile embedding with new data.
   *
   * Call this whenever the user completes a new assessment, finishes an
   * important conversation, or their dial scores change significantly.
   * The vector DB always holds the most current snapshot.
   */
  async updateUserEmbedding(
    userId: string,
    newEmbedding: number[],
  ): Promise<string> {
    return this.storeUserProfile({ userId, embedding: newEmbedding });
  }

  // -----------------------------------------------------------------------
  // Read / maintenance
  // -----------------------------------------------------------------------

  /** Check whether a profile exists for the given user. */
  async hasProfile(userId: string): Promise<boolean> {
    const entry = await this.client.getCollection(COLLECTION).get(userId);
    return entry !== null;
  }

  /** Remove a user's profile embedding. */
  async removeProfile(userId: string): Promise<boolean> {
    return this.client.remove(COLLECTION, userId);
  }

  /** Total number of user profiles stored. */
  async count(): Promise<number> {
    return this.client.getCollection(COLLECTION).len();
  }
}
