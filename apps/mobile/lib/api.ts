import * as SecureStore from 'expo-secure-store';
import type {
  ApiResponse,
  PaginatedResponse,
  Conversation,
  ConversationMode,
  FiveDialsAssessment,
  DialRating,
  MarriageContext,
  OnboardingResponse,
  UserProfile,
  StreakData,
  Milestone,
  PromptContent,
  PodcastEpisode,
  MicroChallenge,
  MarriageHealthScore,
} from '@coach-keith/shared';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await SecureStore.getItemAsync('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(await getAuthHeaders()),
  };

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Request failed' }));
    return { success: false, error: err.message ?? 'Unknown error' };
  }

  const data = await res.json();
  return { success: true, data };
}

// ---- Auth ----
export async function login(email: string, password: string) {
  return request<{ token: string; user: UserProfile }>('POST', '/auth/login', {
    email,
    password,
  });
}

export async function register(
  email: string,
  password: string,
  displayName: string,
) {
  return request<{ token: string; user: UserProfile }>(
    'POST',
    '/auth/register',
    { email, password, displayName },
  );
}

export async function loginWithApple(identityToken: string) {
  return request<{ token: string; user: UserProfile }>(
    'POST',
    '/auth/apple',
    { identityToken },
  );
}

// ---- User ----
export async function getProfile() {
  return request<UserProfile>('GET', '/user/profile');
}

export async function completeOnboarding(data: {
  marriageContext: MarriageContext;
  onboardingResponses: OnboardingResponse[];
  initialAssessment: DialRating[];
  preferences: { notificationTime: string; goals: string[] };
}) {
  return request<UserProfile>('POST', '/user/onboarding', data);
}

// ---- Coaching ----
export async function getConversations(page = 1) {
  return request<PaginatedResponse<Conversation>>(
    'GET',
    `/coaching/conversations?page=${page}`,
  );
}

export async function createConversation(mode: ConversationMode) {
  return request<Conversation>('POST', '/coaching/conversations', { mode });
}

export async function sendMessage(conversationId: string, content: string) {
  return request<{ userMessage: unknown; assistantMessage: unknown }>(
    'POST',
    `/coaching/conversations/${conversationId}/messages`,
    { content },
  );
}

// ---- Assessment ----
export async function submitAssessment(ratings: DialRating[]) {
  return request<FiveDialsAssessment>('POST', '/assessment', { ratings });
}

export async function getAssessmentHistory(limit = 10) {
  return request<FiveDialsAssessment[]>(
    'GET',
    `/assessment/history?limit=${limit}`,
  );
}

export async function getHealthScore() {
  return request<MarriageHealthScore>('GET', '/assessment/health-score');
}

// ---- Engagement ----
export async function getStreak() {
  return request<StreakData>('GET', '/engagement/streak');
}

export async function getMilestones() {
  return request<Milestone[]>('GET', '/engagement/milestones');
}

export async function getDailyPrompt() {
  return request<PromptContent>('GET', '/engagement/daily-prompt');
}

// ---- Content ----
export async function getEpisodes(page = 1, category?: string) {
  const params = new URLSearchParams({ page: String(page) });
  if (category) params.set('category', category);
  return request<PaginatedResponse<PodcastEpisode>>(
    'GET',
    `/content/episodes?${params}`,
  );
}

export async function searchContent(query: string) {
  return request<PaginatedResponse<PodcastEpisode>>(
    'GET',
    `/content/search?q=${encodeURIComponent(query)}`,
  );
}

// ---- Challenges ----
export async function getActiveChallenges() {
  return request<MicroChallenge[]>('GET', '/challenges/active');
}

export async function completeChallenge(challengeId: string) {
  return request<MicroChallenge>(
    'POST',
    `/challenges/${challengeId}/complete`,
  );
}
