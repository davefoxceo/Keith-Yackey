import { Module, Global } from '@nestjs/common';
import { LearningService } from './learning.service';
import { RuvectorService } from './ruvector.service';
import { DataStore } from './data-store.service';

@Global()
@Module({
  providers: [LearningService, RuvectorService, DataStore],
  exports: [LearningService, RuvectorService, DataStore],
})
export class LearningModule {}
