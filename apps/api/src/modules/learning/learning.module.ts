import { Module, Global } from '@nestjs/common';
import { LearningService } from './learning.service';
import { PiBrainService } from './pi-brain.service';

@Global()
@Module({
  providers: [LearningService, PiBrainService],
  exports: [LearningService, PiBrainService],
})
export class LearningModule {}
