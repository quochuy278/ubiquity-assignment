import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { GroupModule } from '../group/group.module';
import { ActivityController } from './activity.controller';
import { ActivityService } from './activity.service';
import { ActivityRepository } from './repositories/activity.repository';

@Module({
  imports: [AuthModule, GroupModule],
  controllers: [ActivityController],
  providers: [ActivityService, ActivityRepository],
  exports: [ActivityService],
})
export class ActivityModule {}
