import { useQueryClient } from '@tanstack/react-query';
import type { Message } from 'ably';
import { ChannelProvider, useChannel, useConnectionStateListener } from 'ably/react';
import { type ReactNode, useRef } from 'react';
import { GroupType } from '@/api/generated';
import { queryKeys } from '@/api/query-keys';
import { useRealtimeAvailable } from './realtime-context';
import {
  isTodoListRealtimeEvent,
  TodoListRealtimeEventType,
  todoListChannelName,
} from './realtime-contract';

interface TodoListRealtimeProps {
  children: ReactNode;
  groupType: GroupType;
  todoIds: string[];
  todoListId: string;
}

interface TodoListRealtimeSubscriberProps {
  channelName: string;
  todoIds: string[];
  todoListId: string;
}

const channelOptions = { attachOnSubscribe: true } as const;

function TodoListRealtimeSubscriber({
  channelName,
  todoIds,
  todoListId,
}: TodoListRealtimeSubscriberProps) {
  const queryClient = useQueryClient();
  const currentTodoIds = useRef(todoIds);
  currentTodoIds.current = todoIds;

  const invalidateTodos = (message: Message) => {
    if (!isTodoListRealtimeEvent(message.data)) return;
    if (message.name !== message.data.type || message.data.todoListId !== todoListId) return;

    void queryClient.invalidateQueries({
      queryKey: queryKeys.todos.forList(todoListId),
      exact: true,
    });
  };

  const invalidateSubtasks = (message: Message) => {
    if (!isTodoListRealtimeEvent(message.data)) return;
    if (message.name !== message.data.type || message.data.todoListId !== todoListId) return;

    void queryClient.invalidateQueries({
      queryKey: queryKeys.subtasks.forTodo(message.data.todoId),
      exact: true,
    });
  };

  useChannel(channelName, TodoListRealtimeEventType.TODO_CREATED, invalidateTodos);
  useChannel(channelName, TodoListRealtimeEventType.TODO_COMPLETION_CHANGED, invalidateTodos);
  useChannel(channelName, TodoListRealtimeEventType.TODO_REORDERED, invalidateTodos);
  useChannel(channelName, TodoListRealtimeEventType.SUBTASK_CREATED, invalidateSubtasks);
  useChannel(channelName, TodoListRealtimeEventType.SUBTASK_COMPLETION_CHANGED, invalidateSubtasks);

  useConnectionStateListener('connected', () => {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.todos.forList(todoListId),
      exact: true,
    });
    for (const todoId of currentTodoIds.current) {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.subtasks.forTodo(todoId),
        exact: true,
      });
    }
  });

  return null;
}

export function TodoListRealtime({
  children,
  groupType,
  todoIds,
  todoListId,
}: TodoListRealtimeProps) {
  const realtimeAvailable = useRealtimeAvailable();
  if (groupType !== GroupType.Shared || !realtimeAvailable) return children;

  const channelName = todoListChannelName(todoListId);

  return (
    <ChannelProvider key={channelName} channelName={channelName} options={channelOptions}>
      <TodoListRealtimeSubscriber
        channelName={channelName}
        todoIds={todoIds}
        todoListId={todoListId}
      />
      {children}
    </ChannelProvider>
  );
}
