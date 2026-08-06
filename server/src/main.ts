import { ValidationPipe, VERSION_NEUTRAL, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app/app.module';
import type { ApplicationConfig } from './shared/config/configuration.interface';
import { setupOpenApi } from './shared/openapi/openapi';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get<ConfigService<ApplicationConfig, true>>(ConfigService);
  const appConfig = configService.get('app', { infer: true });

  app.enableShutdownHooks();

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: VERSION_NEUTRAL,
  });

  app.setGlobalPrefix('api');

  setupOpenApi(app);

  await app.listen(appConfig.port);
}

void bootstrap();
