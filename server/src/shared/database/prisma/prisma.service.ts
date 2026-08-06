import { Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import type { ApplicationConfig } from '../../config/configuration.interface';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(configService: ConfigService<ApplicationConfig, true>) {
    const database = configService.get('database', { infer: true });

    const adapter = new PrismaPg({
      connectionString: database.url,
      connectionTimeoutMillis: database.connectionTimeoutMillis,
      idleTimeoutMillis: database.idleTimeoutMillis,
      max: database.maxConnections,
    });

    super({ adapter });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
