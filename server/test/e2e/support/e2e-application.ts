import {
  type INestApplication,
  ValidationPipe,
  VERSION_NEUTRAL,
  VersioningType,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import type { App } from 'supertest/types';
import { AppModule } from '../../../src/app/app.module';
import { ErrorCode } from '../../../src/common/exception/error-code';
import { GlobalException } from '../../../src/common/exception/global.exception';
import { formatValidationErrors } from '../../../src/common/exception/validation-error.formatter';
import type { ApplicationConfig } from '../../../src/shared/config/configuration.interface';
import { RealtimePublisher } from '../../../src/shared/realtime/realtime.publisher';

export async function createE2eApplication(): Promise<INestApplication<App>> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(RealtimePublisher)
    .useValue({
      publishGroupEvent: () => Promise.resolve(),
      publishTodoListEvent: () => Promise.resolve(),
    })
    .compile();
  const app = moduleFixture.createNestApplication();
  const configService = app.get<ConfigService<ApplicationConfig, true>>(ConfigService);
  const appConfig = configService.get('app', { infer: true });

  app.enableCors({
    origin: appConfig.corsOrigin === '*' ? '*' : [appConfig.corsOrigin],
  });
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
  app.setGlobalPrefix('api');

  await app.init();

  return app;
}
