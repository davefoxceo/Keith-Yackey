import { Module, Global } from '@nestjs/common';
import { LearningService } from './learning.service';

@Global()
@Module({
  providers: [LearningService],
  exports: [LearningService],
})
export class LearningModule {}
