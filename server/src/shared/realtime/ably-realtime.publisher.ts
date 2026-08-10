import { Inject, Injectable } from '@nestjs/common';
import type { Rest } from 'ably';
import { ApplicationLoggerService } from '../../common/logger/logger.service';
import { groupChannelName, todoListChannelName } from './realtime.constants';
import { RealtimePublisher } from './realtime.publisher';
import { ABLY_REST_CLIENT } from './realtime.tokens';
import type { GroupRealtimeEvent, TodoListRealtimeEvent } from './realtime.types';

@Injectable()
export class AblyRealtimePublisher extends RealtimePublisher {
  constructor(
    @Inject(ABLY_REST_CLIENT) private readonly ably: Rest,
    private readonly logger: ApplicationLoggerService,
  ) {
    super();
  }

  async publishGroupEvent(event: GroupRealtimeEvent): Promise<void> {
    const channelName = groupChannelName(event.groupId);
    await this.ably.channels.get(channelName).publish(event.type, event);

    this.logPublishedEvent(channelName, event);
  }

  async publishTodoListEvent(event: TodoListRealtimeEvent): Promise<void> {
    const channelName = todoListChannelName(event.todoListId);
    await this.ably.channels.get(channelName).publish(event.type, event);

    this.logPublishedEvent(channelName, event);
  }

  private logPublishedEvent(
    channelName: string,
    event: GroupRealtimeEvent | TodoListRealtimeEvent,
  ): void {
    this.logger.success(
      'Realtime event published',
      {
        channelName,
        eventType: event.type,
        ...('groupId' in event ? { groupId: event.groupId } : {}),
        ...('todoListId' in event ? { todoListId: event.todoListId } : {}),
        ...('todoId' in event ? { todoId: event.todoId } : {}),
        ...('subtaskId' in event ? { subtaskId: event.subtaskId } : {}),
      },
      AblyRealtimePublisher.name,
    );
  }
}
