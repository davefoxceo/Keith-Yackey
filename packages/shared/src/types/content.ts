import type { DialType } from './assessment';

export enum ContentSourceType {
  PODCAST = 'PODCAST',
  BOOK = 'BOOK',
  INSTAGRAM = 'INSTAGRAM',
  COACHING_SESSION = 'COACHING_SESSION',
  FRAMEWORK = 'FRAMEWORK',
  RECORDING = 'RECORDING',
}

export interface PodcastEpisode {
  id: string;
  title: string;
  date: Date;
  duration: number;
  audioUrl: string;
  transcriptUrl?: string;
  description: string;
  topics: string[];
  dialRelevance: DialType[];
}

export interface ContentChunkMetadata {
  speaker?: string;
  timestamp?: number;
  topic?: string;
  dial?: DialType;
}

export interface ContentChunk {
  id: string;
  sourceId: string;
  sourceType: ContentSourceType;
  text: string;
  embedding?: number[];
  metadata: ContentChunkMetadata;
}

export interface BookChapter {
  id: string;
  chapterNumber: number;
  title: string;
  sections: string[];
}

export interface Framework {
  id: string;
  name: string;
  description: string;
  dialRelevance: DialType[];
  content: string;
}
