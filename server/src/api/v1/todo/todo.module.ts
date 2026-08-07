import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TodoListModule } from '../todo-list/todo-list.module';
import { TodoRepository } from './repositories/todo.repository';
import { TodoController } from './todo.controller';
import { TodoService } from './todo.service';

@Module({
  imports: [AuthModule, TodoListModule],
  controllers: [TodoController],
  providers: [TodoService, TodoRepository],
})
export class TodoModule {}
