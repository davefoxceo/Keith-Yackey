/** Branded string type for user identifiers. */
export type UserId = string & { readonly __brand: 'UserId' };

export interface UserProfile {
  id: UserId;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export enum MarriageStage {
  CRISIS = 'CRISIS',
  DISCONNECTED = 'DISCONNECTED',
  REBUILDING = 'REBUILDING',
  THRIVING = 'THRIVING',
}

export interface MarriageContext {
  wifeName: string;
  kidsCount: number;
  kidNames: string[];
  marriageDuration: number;
  currentState: MarriageStage;
}

export interface OnboardingResponse {
  questionId: string;
  answer: string;
  score: number;
}

export enum AnonymityPreference {
  ANONYMOUS = 'ANONYMOUS',
  DISPLAY_NAME = 'DISPLAY_NAME',
  REAL_NAME = 'REAL_NAME',
}

export interface UserPreferences {
  notificationTime: string;
  reflectionTime: string;
  timezone: string;
  anonymityPreference: AnonymityPreference;
}
