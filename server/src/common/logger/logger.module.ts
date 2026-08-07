import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import type { ApplicationConfig } from '../../shared/config/configuration.interface';
import { RequestContextModule } from '../request-context/request-context.module';
import { createLoggerOptions } from './logger.factory';
import { ApplicationLoggerService } from './logger.service';

@Global()
@Module({
  imports: [
    RequestContextModule,
    WinstonModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService<ApplicationConfig, true>) => {
        const appConfig = configService.get('app', { infer: true });

        return createLoggerOptions(appConfig.environment);
      },
    }),
  ],
  providers: [ApplicationLoggerService],
  exports: [ApplicationLoggerService],
})
export class LoggerModule {}
