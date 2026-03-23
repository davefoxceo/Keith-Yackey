import type { UserId } from './user';

export enum ModerationStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  FLAGGED = 'FLAGGED',
  REMOVED = 'REMOVED',
}

export interface BrotherhoodPost {
  id: string;
  authorId: UserId;
  isAnonymous: boolean;
  content: string;
  upvotes: number;
  createdAt: Date;
  moderationStatus: ModerationStatus;
  pinnedBy?: UserId;
}

export enum PartnershipStatus {
  PROPOSED = 'PROPOSED',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  ENDED = 'ENDED',
}

export interface AccountabilityPartnership {
  id: string;
  user1Id: UserId;
  user2Id: UserId;
  status: PartnershipStatus;
  matchScore: number;
  createdAt: Date;
}

export type CommitmentStatus = 'ACTIVE' | 'COMPLETED' | 'MISSED';

export interface SharedCommitment {
  id: string;
  partnershipId: string;
  description: string;
  deadline: Date;
  status: CommitmentStatus;
  completedAt?: Date;
}
