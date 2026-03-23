/**
 * DataStore — JSON file-based persistence for structured data.
 *
 * Persists user accounts, conversation messages, assessment scores,
 * and engagement data to JSON files in the data/ directory.
 *
 * This is NOT for vector search (use RuvectorService for that).
 * This is for structured data that needs to survive restarts.
 *
 * Files:
 *   data/users.json          — user accounts (email, passwordHash, profile)
 *   data/conversations.json  — conversation messages per user
 *   data/assessments.json    — Five Dials assessment history per user
 *   data/engagement.json     — streaks, milestones, reflections per user
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

@Injectable()
export class DataStore implements OnModuleInit {
  private readonly logger = new Logger(DataStore.name);
  private readonly dataDir: string;
  private stores = new Map<string, Map<string, unknown>>();
  private writeTimers = new Map<string, NodeJS.Timeout>();

  constructor() {
    this.dataDir =
      process.env.DATA_DIR ||
      join(process.cwd(), '..', '..', 'data');
  }

  onModuleInit() {
    if (!existsSync(this.dataDir)) {
      mkdirSync(this.dataDir, { recursive: true });
    }
    this.logger.log(`DataStore initialized at ${this.dataDir}`);
  }

  // -----------------------------------------------------------------------
  // Generic store operations
  // -----------------------------------------------------------------------

  /**
   * Get a collection (lazy-loaded from disk on first access).
   */
  private getStore(collection: string): Map<string, unknown> {
    if (!this.stores.has(collection)) {
      const filePath = join(this.dataDir, `${collection}.json`);
      const map = new Map<string, unknown>();

      if (existsSync(filePath)) {
        try {
          const data = JSON.parse(readFileSync(filePath, 'utf8'));
          for (const [key, value] of Object.entries(data)) {
            map.set(key, value);
          }
          this.logger.log(`Loaded ${map.size} entries from ${collection}.json`);
        } catch (e) {
          this.logger.error(`Failed to load ${collection}.json: ${e.message}`);
        }
      }

      this.stores.set(collection, map);
    }
    return this.stores.get(collection)!;
  }

  /**
   * Schedule a debounced write to disk (100ms after last change).
   */
  private scheduleSave(collection: string): void {
    if (this.writeTimers.has(collection)) {
      clearTimeout(this.writeTimers.get(collection)!);
    }
    this.writeTimers.set(
      collection,
      setTimeout(() => this.saveToDisk(collection), 100),
    );
  }

  private saveToDisk(collection: string): void {
    const store = this.stores.get(collection);
    if (!store) return;

    const filePath = join(this.dataDir, `${collection}.json`);
    const obj: Record<string, unknown> = {};
    for (const [key, value] of store) {
      obj[key] = value;
    }

    try {
      writeFileSync(filePath, JSON.stringify(obj, null, 2));
    } catch (e) {
      this.logger.error(`Failed to save ${collection}.json: ${e.message}`);
    }
  }

  /** Force save all collections to disk (call on shutdown). */
  flushAll(): void {
    for (const collection of this.stores.keys()) {
      this.saveToDisk(collection);
    }
  }

  // -----------------------------------------------------------------------
  // CRUD operations
  // -----------------------------------------------------------------------

  set(collection: string, key: string, value: unknown): void {
    this.getStore(collection).set(key, value);
    this.scheduleSave(collection);
  }

  get<T = unknown>(collection: string, key: string): T | undefined {
    return this.getStore(collection).get(key) as T | undefined;
  }

  has(collection: string, key: string): boolean {
    return this.getStore(collection).has(key);
  }

  delete(collection: string, key: string): boolean {
    const result = this.getStore(collection).delete(key);
    if (result) this.scheduleSave(collection);
    return result;
  }

  getAll<T = unknown>(collection: string): Map<string, T> {
    return this.getStore(collection) as Map<string, T>;
  }

  /**
   * Find entries matching a predicate.
   */
  find<T = unknown>(
    collection: string,
    predicate: (key: string, value: T) => boolean,
  ): Array<[string, T]> {
    const results: Array<[string, T]> = [];
    for (const [key, value] of this.getStore(collection)) {
      if (predicate(key, value as T)) {
        results.push([key, value as T]);
      }
    }
    return results;
  }

  count(collection: string): number {
    return this.getStore(collection).size;
  }
}
