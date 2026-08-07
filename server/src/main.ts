import { ValidationPipe, VERSION_NEUTRAL, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app/app.module';
import { ErrorCode } from './common/exception/error-code';
import { GlobalException } from './common/exception/global.exception';
import { formatValidationErrors } from './common/exception/validation-error.formatter';
import {
  createStartupDisplayUrl,
  logApplicationStartup,
} from './common/logger/log-application-startup';
import { ApplicationLoggerService } from './common/logger/logger.service';
import type { ApplicationConfig } from './shared/config/configuration.interface';
import { OPENAPI_ROUTE, setupOpenApi } from './shared/openapi/openapi';

const GLOBAL_API_PREFIX = 'api';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });
  const configService = app.get<ConfigService<ApplicationConfig, true>>(ConfigService);
  const appConfig = configService.get('app', { infer: true });
  const logger = app.get(ApplicationLoggerService);

  app.useLogger(logger);

  app.enableShutdownHooks();

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      exceptionFactory: (errors) =>
        new GlobalException(ErrorCode.VALIDATION_ERROR, {
          errors: formatValidationErrors(errors),
        }),
    }),
  );

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: VERSION_NEUTRAL,
  });

  app.setGlobalPrefix(GLOBAL_API_PREFIX);

  setupOpenApi(app);

  await app.listen(appConfig.port);

  const applicationUrl = createStartupDisplayUrl(await app.getUrl());
  logApplicationStartup(logger, {
    environment: appConfig.environment,
    url: applicationUrl,
    swaggerUrl: `${applicationUrl}/${GLOBAL_API_PREFIX}/${OPENAPI_ROUTE}`,
  });
}

void bootstrap();
