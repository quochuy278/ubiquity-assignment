import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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
    PrismaModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
