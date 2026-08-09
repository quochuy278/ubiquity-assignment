import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { ErrorCode } from '../../src/common/exception/error-code';
import { createE2eApplication } from './support/e2e-application';
import { createUniqueUserInput } from './support/unique-test-data';

function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Expected ${field} to be a non-empty string`);
  }
  return value;
}

describe('Logout lifecycle over real HTTP and PostgreSQL', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createE2eApplication();
  });

  afterAll(async () => {
    await app.close();
  });

  it('revokes the current rotated refresh session idempotently', async () => {
    const input = createUniqueUserInput('logout');
    const registration = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(input)
      .expect(201);
    const initialRefreshToken = requireString(
      registration.body.refreshToken,
      'registration refresh token',
    );

    const refreshed = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: initialRefreshToken })
      .expect(200);
    const accessToken = requireString(refreshed.body.accessToken, 'rotated access token');
    const rotatedRefreshToken = requireString(refreshed.body.refreshToken, 'rotated refresh token');

    await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(204);

    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: rotatedRefreshToken })
      .expect(401)
      .expect({ code: ErrorCode.INVALID_REFRESH_TOKEN });

    await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(204);

    await request(app.getHttpServer()).post('/api/v1/auth/logout').expect(401);
  });
});
