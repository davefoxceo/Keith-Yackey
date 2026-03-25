import { Module } from '@nestjs/common';
import { CoachingController } from './coaching.controller';
import { CoachingService } from './coaching.service';
import { AccountabilityService } from './accountability.service';
import { ChallengeService } from './challenge.service';

@Module({
  controllers: [CoachingController],
  providers: [CoachingService, AccountabilityService, ChallengeService],
  exports: [CoachingService, AccountabilityService, ChallengeService],
})
export class CoachingModule {}
