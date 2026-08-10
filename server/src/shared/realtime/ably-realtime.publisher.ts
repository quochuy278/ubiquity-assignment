import { Inject, Injectable } from '@nestjs/common';
import type { Rest } from 'ably';
import { todoListChannelName } from './realtime.constants';
import { RealtimePublisher } from './realtime.publisher';
import { ABLY_REST_CLIENT } from './realtime.tokens';
import type { TodoListRealtimeEvent } from './realtime.types';

@Injectable()
export class AblyRealtimePublisher extends RealtimePublisher {
  constructor(@Inject(ABLY_REST_CLIENT) private readonly ably: Rest) {
    super();
  }

  async publishTodoListEvent(event: TodoListRealtimeEvent): Promise<void> {
    await this.ably.channels.get(todoListChannelName(event.todoListId)).publish(event.type, event);
  }
}
