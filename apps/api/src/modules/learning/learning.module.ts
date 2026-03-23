import { Module, Global } from '@nestjs/common';
import { LearningService } from './learning.service';
import { RuvectorService } from './ruvector.service';

@Global()
@Module({
  providers: [LearningService, RuvectorService],
  exports: [LearningService, RuvectorService],
})
export class LearningModule {}
