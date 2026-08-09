import { Module } from '@nestjs/common';
import { ActivityModule } from '../activity/activity.module';
import { AuthModule } from '../auth/auth.module';
import { GroupModule } from '../group/group.module';
import { TodoListRepository } from './repositories/todo-list.repository';
import { TodoListController } from './todo-list.controller';
import { TodoListService } from './todo-list.service';

@Module({
  imports: [AuthModule, GroupModule, ActivityModule],
  controllers: [TodoListController],
  providers: [TodoListService, TodoListRepository],
  exports: [TodoListService],
})
export class TodoListModule {}
