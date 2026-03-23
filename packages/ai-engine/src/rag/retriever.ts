/**
 * RAGRetriever — Retrieves and ranks relevant content chunks from Ruvector
 * for inclusion in the coaching context.
 */

export interface RuvectorClient {
  search(params: {
    query: string;
    collection: string;
    limit: number;
    filters?: Record<string, unknown>;
    includeMetadata?: boolean;
  }): Promise<SearchResult[]>;
}

export interface SearchResult {
  id: string;
  content: string;
  score: number;
  metadata: Record<string, unknown>;
}

export interface RetrievalFilters {
  contentType?: string[];
  framework?: string[];
  tags?: string[];
  minScore?: number;
}

export interface ContentChunk {
  id: string;
  content: string;
  relevanceScore: number;
  contentType: string;
  source: string;
  metadata: Record<string, unknown>;
}

const DEFAULT_COLLECTION = 'coach-keith-content';

export class RAGRetriever {
  private readonly client: RuvectorClient;
  private readonly collection: string;

  constructor(client: RuvectorClient, collection: string = DEFAULT_COLLECTION) {
    this.client = client;
    this.collection = collection;
  }

  /**
   * Retrieve relevant content chunks from Ruvector based on the query.
   */
  async retrieve(
    query: string,
    filters?: RetrievalFilters,
    limit: number = 5,
  ): Promise<ContentChunk[]> {
    const searchFilters: Record<string, unknown> = {};

    if (filters?.contentType?.length) {
      searchFilters['content_type'] = { $in: filters.contentType };
    }
    if (filters?.framework?.length) {
      searchFilters['framework'] = { $in: filters.framework };
    }
    if (filters?.tags?.length) {
      searchFilters['tags'] = { $overlap: filters.tags };
    }

    const results = await this.client.search({
      query,
      collection: this.collection,
      limit: limit * 2, // over-fetch to allow re-ranking
      filters: Object.keys(searchFilters).length > 0 ? searchFilters : undefined,
      includeMetadata: true,
    });

    const minScore = filters?.minScore ?? 0.5;
    const filtered = results.filter((r) => r.score >= minScore);

    const chunks = filtered.map((r) => this.toContentChunk(r));

    return this.rankByRelevance(chunks, query).slice(0, limit);
  }

  /**
   * Build a formatted context string from retrieved chunks for injection
   * into the Claude prompt.
   */
  buildContext(chunks: ContentChunk[]): string {
    if (chunks.length === 0) {
      return '';
    }

    const sections = chunks.map((chunk, i) => {
      const sourceLabel = chunk.contentType
        ? `[${chunk.contentType.toUpperCase()}]`
        : '[CONTENT]';

      return [
        `--- Relevant ${sourceLabel} (${i + 1}/${chunks.length}) ---`,
        chunk.content.trim(),
        chunk.source ? `Source: ${chunk.source}` : '',
      ]
        .filter(Boolean)
        .join('\n');
    });

    return [
      '═══ RELEVANT COACHING CONTENT ═══',
      '',
      'Use the following retrieved content to inform your response. Reference specific frameworks, stories, or insights when relevant. Do not quote verbatim — synthesize naturally into your coaching voice.',
      '',
      ...sections,
      '',
      '═══ END COACHING CONTENT ═══',
    ].join('\n');
  }

  /**
   * Re-rank content chunks by computing a combined relevance score
   * that considers vector similarity, content type priority, and recency.
   */
  rankByRelevance(chunks: ContentChunk[], _query: string): ContentChunk[] {
    const typeWeights: Record<string, number> = {
      framework: 1.3,
      story: 1.2,
      exercise: 1.1,
      transcript: 1.0,
      blog: 0.9,
      general: 0.8,
    };

    return [...chunks]
      .map((chunk) => {
        const typeWeight = typeWeights[chunk.contentType] ?? 1.0;
        const adjustedScore = chunk.relevanceScore * typeWeight;
        return { ...chunk, relevanceScore: adjustedScore };
      })
      .sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  private toContentChunk(result: SearchResult): ContentChunk {
    return {
      id: result.id,
      content: result.content,
      relevanceScore: result.score,
      contentType: (result.metadata['content_type'] as string) ?? 'general',
      source: (result.metadata['source'] as string) ?? '',
      metadata: result.metadata,
    };
  }
}
