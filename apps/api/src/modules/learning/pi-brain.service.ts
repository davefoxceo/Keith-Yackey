/**
 * PiBrainService — Connects Coach Keith API to the local Pi-Brain MCP server.
 *
 * Spawns mcp-brain as a child process via stdio MCP transport and provides
 * typed methods for all coaching operations:
 *
 *   - Semantic search (RAG retrieval of Keith's content)
 *   - Conversation storage (user-scoped via namespace)
 *   - Feedback ingestion (for SONA learning)
 *   - Memory recall (context-aware retrieval)
 *
 * USER ISOLATION: Each user's data is stored in a sub-namespace
 *   "coach-keith/user/{userId}" so it can never be retrieved by another user.
 *   Keith's coaching content is in the shared "coach-keith" namespace.
 */

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { spawn, type ChildProcess } from 'child_process';

interface McpResponse {
  result?: {
    content?: Array<{ text?: string; type?: string }>;
    tools?: Array<{ name: string; inputSchema: unknown }>;
  };
  error?: { code: number; message: string };
}

interface RAGResult {
  workingSet: string;
  pointers: string[];
  answerSummary: string;
}

@Injectable()
export class PiBrainService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PiBrainService.name);
  private brain: ChildProcess | null = null;
  private buffer = '';
  private pending = new Map<number, (msg: McpResponse) => void>();
  private reqId = 1;
  private initialized = false;
  private readonly dbUrl: string;

  constructor() {
    this.dbUrl =
      process.env.PI_BRAIN_DATABASE_URL ||
      process.env.DATABASE_URL ||
      'postgresql://navigator:navigator@localhost:5433/coach_keith_brain';
  }

  async onModuleInit() {
    await this.start();
  }

  onModuleDestroy() {
    this.stop();
  }

  // -----------------------------------------------------------------------
  // Lifecycle
  // -----------------------------------------------------------------------

  private async start(): Promise<void> {
    try {
      this.brain = spawn('npx', ['-y', 'mcp-brain@latest'], {
        env: {
          ...process.env,
          DATABASE_URL: this.dbUrl,
          MEMORY_NAMESPACE: 'coach-keith',
        },
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      this.brain.stdout!.on('data', (data: Buffer) => {
        this.buffer += data.toString();
        const lines = this.buffer.split('\n');
        this.buffer = lines.pop() || '';
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const msg = JSON.parse(line);
            if (msg.id && this.pending.has(msg.id)) {
              this.pending.get(msg.id)!(msg);
              this.pending.delete(msg.id);
            }
          } catch {
            // Ignore non-JSON lines
          }
        }
      });

      this.brain.stderr!.on('data', () => {
        // Suppress stderr noise
      });

      this.brain.on('exit', (code) => {
        this.logger.warn(`Pi-Brain process exited with code ${code}`);
        this.initialized = false;
      });

      // Initialize MCP protocol
      const init = await this.rpc('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'coach-keith-api', version: '1.0' },
      });

      this.notify('notifications/initialized');
      await new Promise((r) => setTimeout(r, 300));

      if (init.result) {
        this.initialized = true;
        const serverInfo = (init.result as Record<string, Record<string, string>>)?.serverInfo;
        this.logger.log(
          `Pi-Brain connected: ${serverInfo?.name || 'unknown'} v${serverInfo?.version || '?'}`,
        );
      } else {
        this.logger.error('Pi-Brain initialization failed');
      }
    } catch (error) {
      this.logger.error(`Failed to start Pi-Brain: ${error.message}`);
    }
  }

  private stop(): void {
    if (this.brain) {
      this.brain.kill();
      this.brain = null;
      this.initialized = false;
    }
  }

  get isConnected(): boolean {
    return this.initialized;
  }

  // -----------------------------------------------------------------------
  // MCP Protocol
  // -----------------------------------------------------------------------

  private rpc(method: string, params: unknown): Promise<McpResponse> {
    return new Promise((resolve) => {
      if (!this.brain?.stdin) {
        resolve({ error: { code: -1, message: 'Brain not running' } });
        return;
      }
      const id = this.reqId++;
      this.pending.set(id, resolve);
      this.brain.stdin.write(
        JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n',
      );
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          resolve({ error: { code: -1, message: 'timeout' } });
        }
      }, 30000);
    });
  }

  private notify(method: string): void {
    this.brain?.stdin?.write(
      JSON.stringify({ jsonrpc: '2.0', method }) + '\n',
    );
  }

  private async callTool(
    name: string,
    args: Record<string, unknown>,
  ): Promise<string | null> {
    if (!this.initialized) return null;
    const result = await this.rpc('tools/call', { name, arguments: args });
    return result.result?.content?.[0]?.text || null;
  }

  // -----------------------------------------------------------------------
  // RAG Retrieval (for coaching responses)
  // -----------------------------------------------------------------------

  /**
   * Search Keith's coaching knowledge base for content relevant to the query.
   * Returns structured working set and pointers for injection into the prompt.
   */
  async searchCoachingContent(
    query: string,
    budgetTokens = 1500,
  ): Promise<RAGResult> {
    const raw = await this.callTool('memory_recall_compact', {
      query,
      namespace: 'coach-keith',
      budget_tokens: budgetTokens,
    });

    if (!raw) {
      return { workingSet: '', pointers: [], answerSummary: '' };
    }

    try {
      const parsed = JSON.parse(raw);
      return {
        workingSet: parsed.pack?.working_set_md || '',
        pointers: (parsed.pack?.pointers || []).map(
          (p: Record<string, string>) => p.id,
        ),
        answerSummary: parsed.pack?.answer_summary || '',
      };
    } catch {
      return { workingSet: '', pointers: [], answerSummary: '' };
    }
  }

  // -----------------------------------------------------------------------
  // User Conversation Storage (user-scoped)
  // -----------------------------------------------------------------------

  /**
   * Store a conversation exchange in the user's private namespace.
   * Uses "coach-keith/user/{userId}" for strict isolation.
   */
  async storeConversation(
    userId: string,
    conversationId: string,
    userMessage: string,
    assistantMessage: string,
    mode: string,
  ): Promise<void> {
    const namespace = `coach-keith/user/${userId}`;
    const content = [
      `CONVERSATION: ${conversationId}`,
      `MODE: ${mode}`,
      `USER: ${userMessage.substring(0, 2000)}`,
      `KEITH: ${assistantMessage.substring(0, 2000)}`,
    ].join('\n');

    await this.callTool('memory_ingest', {
      namespace,
      items: [
        {
          type: 'episodic',
          content,
          tags: ['conversation', mode, 'coaching'],
          entities: ['conversation', conversationId],
          salience: 0.6,
          confidence: 0.9,
          source: 'coaching-session',
        },
      ],
    });
  }

  /**
   * Retrieve relevant past conversations for a user.
   * Only searches the user's own namespace — never another user's.
   */
  async recallUserContext(
    userId: string,
    query: string,
    budgetTokens = 800,
  ): Promise<string> {
    const namespace = `coach-keith/user/${userId}`;
    const raw = await this.callTool('memory_recall_compact', {
      query,
      namespace,
      budget_tokens: budgetTokens,
    });

    if (!raw) return '';

    try {
      const parsed = JSON.parse(raw);
      return parsed.pack?.working_set_md || '';
    } catch {
      return '';
    }
  }

  // -----------------------------------------------------------------------
  // Feedback / Learning
  // -----------------------------------------------------------------------

  /**
   * Record user feedback on a coaching response.
   * Stored in the user's namespace with high salience for learning.
   */
  async recordFeedback(
    userId: string,
    conversationId: string,
    messageId: string,
    score: number,
    responseSnippet: string,
    mode: string,
  ): Promise<void> {
    const namespace = `coach-keith/user/${userId}`;
    const sentiment = score >= 4 ? 'positive' : score <= 2 ? 'negative' : 'neutral';
    const content = [
      `FEEDBACK: ${sentiment} (score: ${score}/5)`,
      `CONVERSATION: ${conversationId}`,
      `MESSAGE: ${messageId}`,
      `MODE: ${mode}`,
      `RESPONSE_SNIPPET: ${responseSnippet.substring(0, 500)}`,
    ].join('\n');

    await this.callTool('memory_ingest', {
      namespace,
      items: [
        {
          type: 'episodic',
          content,
          tags: ['feedback', sentiment, mode],
          entities: ['feedback', conversationId],
          salience: score >= 4 ? 0.8 : 0.7,
          confidence: 0.95,
          source: 'user-feedback',
        },
      ],
    });
  }

  // -----------------------------------------------------------------------
  // Stats
  // -----------------------------------------------------------------------

  async getStats(): Promise<Record<string, unknown> | null> {
    const raw = await this.callTool('memory_stats', {
      namespace: 'coach-keith',
    });
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  async getUserStats(userId: string): Promise<Record<string, unknown> | null> {
    const raw = await this.callTool('memory_stats', {
      namespace: `coach-keith/user/${userId}`,
    });
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
}
