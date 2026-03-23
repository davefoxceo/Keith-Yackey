import { Injectable, NotFoundException, Logger } from '@nestjs/common';

interface PodcastEpisode {
  id: string;
  title: string;
  description: string;
  episodeNumber: number;
  season: number;
  duration: number; // seconds
  audioUrl: string;
  thumbnailUrl: string;
  publishedAt: Date;
  tags: string[];
  relatedDials: string[];
  transcript?: string;
  keyTimestamps?: Array<{ time: number; label: string }>;
}

interface BookChapter {
  id: string;
  number: number;
  title: string;
  summary: string;
  keyTakeaways: string[];
  relatedDials: string[];
  exercises: string[];
}

interface Framework {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  steps: Array<{ order: number; title: string; description: string }>;
  relatedDials: string[];
  relatedEpisodes: string[];
}

@Injectable()
export class ContentService {
  private readonly logger = new Logger(ContentService.name);

  // Seeded content data representing Keith's actual content library
  private readonly podcasts: PodcastEpisode[] = [
    {
      id: 'ep-001',
      title: 'The Five Dials Framework: An Introduction',
      description: 'Keith introduces the Five Dials framework — the foundation of every strong marriage and every strong man.',
      episodeNumber: 1,
      season: 1,
      duration: 2520,
      audioUrl: '/audio/ep-001.mp3',
      thumbnailUrl: '/images/ep-001.jpg',
      publishedAt: new Date('2024-01-15'),
      tags: ['five-dials', 'framework', 'introduction', 'foundation'],
      relatedDials: ['parent', 'partner', 'producer', 'player', 'power'],
      transcript: 'Full transcript of Episode 1...',
      keyTimestamps: [
        { time: 60, label: 'What are the Five Dials?' },
        { time: 300, label: 'Why most men focus on the wrong dial first' },
        { time: 720, label: 'The Power dial — where everything starts' },
        { time: 1200, label: 'How the dials interact' },
        { time: 1800, label: 'Your first assessment' },
      ],
    },
    {
      id: 'ep-002',
      title: 'Why Your Marriage Feels Like a Job',
      description: 'When marriage feels like obligation instead of partnership, something is broken. Keith breaks down the pattern and the fix.',
      episodeNumber: 2,
      season: 1,
      duration: 2280,
      audioUrl: '/audio/ep-002.mp3',
      thumbnailUrl: '/images/ep-002.jpg',
      publishedAt: new Date('2024-01-22'),
      tags: ['partner', 'communication', 'patterns', 'obligation'],
      relatedDials: ['partner', 'power'],
    },
    {
      id: 'ep-003',
      title: 'The Accountability Myth: Why Willpower Fails',
      description: 'Stop relying on willpower and start building systems. Keith explains why most accountability structures fail and what works instead.',
      episodeNumber: 3,
      season: 1,
      duration: 1980,
      audioUrl: '/audio/ep-003.mp3',
      thumbnailUrl: '/images/ep-003.jpg',
      publishedAt: new Date('2024-01-29'),
      tags: ['accountability', 'habits', 'systems', 'willpower'],
      relatedDials: ['power'],
    },
    {
      id: 'ep-004',
      title: 'Money Fights: The Real Issue Underneath',
      description: 'Most financial disagreements are not about money. Keith reveals what they are really about and how to have productive financial conversations.',
      episodeNumber: 4,
      season: 1,
      duration: 2100,
      audioUrl: '/audio/ep-004.mp3',
      thumbnailUrl: '/images/ep-004.jpg',
      publishedAt: new Date('2024-02-05'),
      tags: ['producer', 'conflict', 'communication', 'money'],
      relatedDials: ['producer', 'partner'],
    },
    {
      id: 'ep-005',
      title: 'Fatherhood Is Not a Side Quest',
      description: 'Your kids are watching everything you do. Keith talks about intentional fatherhood and the legacy you are building every single day.',
      episodeNumber: 5,
      season: 1,
      duration: 2400,
      audioUrl: '/audio/ep-005.mp3',
      thumbnailUrl: '/images/ep-005.jpg',
      publishedAt: new Date('2024-02-12'),
      tags: ['parent', 'fatherhood', 'legacy', 'intentional'],
      relatedDials: ['parent', 'power'],
    },
  ];

  private readonly chapters: BookChapter[] = [
    {
      id: 'ch-01',
      number: 1,
      title: 'The Wake-Up Call',
      summary: 'Most men do not start their growth journey until something breaks. This chapter explores the common wake-up calls and why they are actually gifts.',
      keyTakeaways: [
        'Pain is often the catalyst for transformation',
        'The man you are today is the sum of your daily choices',
        'It is never too late to start doing the work',
      ],
      relatedDials: ['power'],
      exercises: ['Write your "rock bottom" moment', 'List 3 things you are tolerating that you should not be'],
    },
    {
      id: 'ch-02',
      number: 2,
      title: 'The Five Dials',
      summary: 'An in-depth exploration of each dial — Parent, Partner, Producer, Player, and Power — and how they interconnect.',
      keyTakeaways: [
        'All five dials must be addressed for sustainable growth',
        'Power is the foundation dial — you cannot give what you do not have',
        'Imbalance in one dial will eventually affect all the others',
      ],
      relatedDials: ['parent', 'partner', 'producer', 'player', 'power'],
      exercises: ['Complete your first Five Dials assessment', 'Identify your highest and lowest dials'],
    },
    {
      id: 'ch-03',
      number: 3,
      title: 'The Communication Breakdown',
      summary: 'Why men struggle with emotional communication and the practical framework for having conversations that connect instead of combust.',
      keyTakeaways: [
        'Listening is not waiting for your turn to talk',
        'Defensiveness is the death of intimacy',
        'Ask questions before making statements',
      ],
      relatedDials: ['partner', 'power'],
      exercises: ['Practice the HEAR framework in one conversation today', 'Ask your wife: "What do you need from me that you are not getting?"'],
    },
  ];

  private readonly frameworks: Framework[] = [
    {
      id: 'fw-five-dials',
      name: 'The Five Dials',
      slug: 'five-dials',
      description: 'The core framework for assessing and improving five key areas of a man\'s life: Parent, Partner, Producer, Player, and Power.',
      category: 'Core Framework',
      steps: [
        { order: 1, title: 'Assess', description: 'Rate each dial honestly from 1-10. No sugarcoating.' },
        { order: 2, title: 'Identify', description: 'Find the lowest dial — that is where the work begins.' },
        { order: 3, title: 'Act', description: 'Choose one micro-action in your lowest dial area.' },
        { order: 4, title: 'Track', description: 'Monitor your progress daily and reassess weekly.' },
        { order: 5, title: 'Iterate', description: 'As one dial rises, shift focus to the next lowest.' },
      ],
      relatedDials: ['parent', 'partner', 'producer', 'player', 'power'],
      relatedEpisodes: ['ep-001'],
    },
    {
      id: 'fw-hear',
      name: 'The HEAR Framework',
      slug: 'hear-framework',
      description: 'A communication framework for productive conversations: Halt, Empathize, Acknowledge, Respond.',
      category: 'Communication',
      steps: [
        { order: 1, title: 'Halt', description: 'Stop what you are doing. Put down the phone. Face your partner.' },
        { order: 2, title: 'Empathize', description: 'Before responding, try to feel what they are feeling. Say "I can see this is important to you."' },
        { order: 3, title: 'Acknowledge', description: 'Repeat back what you heard. "What I am hearing is..."' },
        { order: 4, title: 'Respond', description: 'Now — and only now — share your perspective. Start with "I" statements.' },
      ],
      relatedDials: ['partner'],
      relatedEpisodes: ['ep-002'],
    },
    {
      id: 'fw-3x3',
      name: 'The 3x3 Daily Practice',
      slug: '3x3-daily',
      description: 'Three actions, three times a day to stay grounded and intentional: Morning alignment, midday check-in, evening reflection.',
      category: 'Daily Practice',
      steps: [
        { order: 1, title: 'Morning Alignment (5 min)', description: 'Set your intention. What kind of man will you be today? Review your lowest dial.' },
        { order: 2, title: 'Midday Check-In (2 min)', description: 'Am I living my intention? Have I been reactive or intentional? Quick recalibration.' },
        { order: 3, title: 'Evening Reflection (5 min)', description: 'What went well? Where did I fall short? What am I grateful for? What will I do differently tomorrow?' },
      ],
      relatedDials: ['power'],
      relatedEpisodes: ['ep-003'],
    },
  ];

  async listPodcasts(page: number = 1, limit: number = 20) {
    const sorted = [...this.podcasts].sort(
      (a, b) => b.publishedAt.getTime() - a.publishedAt.getTime(),
    );

    const total = sorted.length;
    const offset = (page - 1) * limit;
    const items = sorted.slice(offset, offset + limit).map((ep) => ({
      id: ep.id,
      title: ep.title,
      description: ep.description,
      episodeNumber: ep.episodeNumber,
      season: ep.season,
      duration: ep.duration,
      thumbnailUrl: ep.thumbnailUrl,
      publishedAt: ep.publishedAt,
      tags: ep.tags,
      relatedDials: ep.relatedDials,
    }));

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getEpisode(episodeId: string) {
    const episode = this.podcasts.find((ep) => ep.id === episodeId);
    if (!episode) {
      throw new NotFoundException('Episode not found');
    }
    return episode;
  }

  async searchEpisodes(query: string) {
    const lowerQuery = query.toLowerCase();
    const results = this.podcasts.filter(
      (ep) =>
        ep.title.toLowerCase().includes(lowerQuery) ||
        ep.description.toLowerCase().includes(lowerQuery) ||
        ep.tags.some((t) => t.toLowerCase().includes(lowerQuery)) ||
        ep.relatedDials.some((d) => d.toLowerCase().includes(lowerQuery)),
    );

    return {
      query,
      results: results.map((ep) => ({
        id: ep.id,
        title: ep.title,
        description: ep.description,
        episodeNumber: ep.episodeNumber,
        duration: ep.duration,
        tags: ep.tags,
        relatedDials: ep.relatedDials,
        publishedAt: ep.publishedAt,
      })),
      total: results.length,
    };
  }

  async listBookChapters() {
    return {
      chapters: this.chapters.map((ch) => ({
        id: ch.id,
        number: ch.number,
        title: ch.title,
        summary: ch.summary,
        keyTakeaways: ch.keyTakeaways,
        relatedDials: ch.relatedDials,
      })),
      totalChapters: this.chapters.length,
    };
  }

  async listFrameworks() {
    return {
      frameworks: this.frameworks.map((fw) => ({
        id: fw.id,
        name: fw.name,
        slug: fw.slug,
        description: fw.description,
        category: fw.category,
        relatedDials: fw.relatedDials,
        stepCount: fw.steps.length,
      })),
      total: this.frameworks.length,
    };
  }

  async getFramework(frameworkId: string) {
    const framework = this.frameworks.find(
      (fw) => fw.id === frameworkId || fw.slug === frameworkId,
    );
    if (!framework) {
      throw new NotFoundException('Framework not found');
    }

    // Resolve related episodes
    const relatedEpisodes = framework.relatedEpisodes
      .map((epId) => this.podcasts.find((ep) => ep.id === epId))
      .filter(Boolean)
      .map((ep) => ({
        id: ep!.id,
        title: ep!.title,
        episodeNumber: ep!.episodeNumber,
        duration: ep!.duration,
      }));

    return { ...framework, relatedEpisodesDetail: relatedEpisodes };
  }

  async getRecommendedContent(
    userId: string,
    fiveDialsScores?: Record<string, number>,
  ) {
    // AI-driven content recommendations based on user's Five Dials scores
    const recommendations: Array<{
      type: string;
      reason: string;
      item: any;
    }> = [];

    if (fiveDialsScores) {
      // Find lowest-scoring dials and recommend relevant content
      const sortedDials = Object.entries(fiveDialsScores).sort(
        ([, a], [, b]) => a - b,
      );
      const weakestDials = sortedDials.slice(0, 2).map(([dial]) => dial);

      for (const dial of weakestDials) {
        // Recommend relevant podcast episodes
        const relevantEpisode = this.podcasts.find((ep) =>
          ep.relatedDials.includes(dial),
        );
        if (relevantEpisode) {
          recommendations.push({
            type: 'podcast',
            reason: `Your ${dial} dial could use attention. This episode addresses that directly.`,
            item: {
              id: relevantEpisode.id,
              title: relevantEpisode.title,
              duration: relevantEpisode.duration,
              episodeNumber: relevantEpisode.episodeNumber,
            },
          });
        }

        // Recommend relevant frameworks
        const relevantFramework = this.frameworks.find((fw) =>
          fw.relatedDials.includes(dial),
        );
        if (relevantFramework) {
          recommendations.push({
            type: 'framework',
            reason: `The ${relevantFramework.name} can help you improve your ${dial} dial.`,
            item: {
              id: relevantFramework.id,
              name: relevantFramework.name,
              description: relevantFramework.description,
              stepCount: relevantFramework.steps.length,
            },
          });
        }

        // Recommend relevant book chapters
        const relevantChapter = this.chapters.find((ch) =>
          ch.relatedDials.includes(dial),
        );
        if (relevantChapter) {
          recommendations.push({
            type: 'book_chapter',
            reason: `Chapter ${relevantChapter.number} covers key principles for your ${dial} dial.`,
            item: {
              id: relevantChapter.id,
              number: relevantChapter.number,
              title: relevantChapter.title,
              summary: relevantChapter.summary,
            },
          });
        }
      }
    }

    // If no scores or few recommendations, add general recommendations
    if (recommendations.length < 3) {
      recommendations.push({
        type: 'podcast',
        reason: 'Start with the fundamentals — this is where every journey begins.',
        item: {
          id: this.podcasts[0].id,
          title: this.podcasts[0].title,
          duration: this.podcasts[0].duration,
          episodeNumber: this.podcasts[0].episodeNumber,
        },
      });
    }

    return {
      recommendations: recommendations.slice(0, 6),
      personalized: !!fiveDialsScores,
    };
  }
}
