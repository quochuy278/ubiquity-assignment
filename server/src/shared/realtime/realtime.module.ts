import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Rest } from 'ably';
import type { ApplicationConfig } from '../config/configuration.interface';
import { AblyRealtimePublisher } from './ably-realtime.publisher';
import { RealtimePublisher } from './realtime.publisher';
import { ABLY_REST_CLIENT } from './realtime.tokens';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: ABLY_REST_CLIENT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService<ApplicationConfig, true>): Rest =>
        new Rest({ key: configService.get('realtime', { infer: true }).ablyKey }),
    },
    {
      provide: RealtimePublisher,
      useClass: AblyRealtimePublisher,
    },
  ],
  exports: [RealtimePublisher],
})
export class RealtimeModule {}
