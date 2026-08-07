import { AuthModule } from './auth/auth.module';
import { GroupModule } from './group/group.module';
import { TodoModule } from './todo/todo.module';
import { TodoListModule } from './todo-list/todo-list.module';

const V1_MODULES = [AuthModule, GroupModule, TodoListModule, TodoModule];

export { V1_MODULES };
