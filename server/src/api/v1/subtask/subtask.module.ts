import { Module } from '@nestjs/common';
import { ActivityModule } from '../activity/activity.module';
import { AuthModule } from '../auth/auth.module';
import { TodoModule } from '../todo/todo.module';
import { SubTaskRepository } from './repositories/subtask.repository';
import { SubTaskController } from './subtask.controller';
import { SubTaskService } from './subtask.service';

@Module({
  imports: [AuthModule, TodoModule, ActivityModule],
  controllers: [SubTaskController],
  providers: [SubTaskService, SubTaskRepository],
})
export class SubTaskModule {}
