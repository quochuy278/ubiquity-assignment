import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { V1_MODULES } from '../api/v1';
import { GlobalExceptionFilter } from '../common/exception/global-exception.filter';
import { LoggerModule } from '../common/logger/logger.module';
import configuration from '../shared/config/configuration';
import { PrismaModule } from '../shared/database/prisma/prisma.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      expandVariables: true,
      envFilePath: ['.env.local', '.env'],
      load: [configuration],
    }),
    LoggerModule,
    PrismaModule,
    ...V1_MODULES,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class AppModule {}
