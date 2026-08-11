import { ActivityModule } from './activity/activity.module';
import { AuthModule } from './auth/auth.module';
import { GroupModule } from './group/group.module';
import { InvitationModule } from './invitation/invitation.module';
import { SubTaskModule } from './subtask/subtask.module';
import { TodoModule } from './todo/todo.module';
import { TodoListModule } from './todo-list/todo-list.module';

const V1_MODULES = [
  AuthModule,
  GroupModule,
  InvitationModule,
  ActivityModule,
  TodoListModule,
  TodoModule,
  SubTaskModule,
];

export { V1_MODULES };
