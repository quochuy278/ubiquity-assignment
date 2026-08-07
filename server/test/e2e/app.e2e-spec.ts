import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { createE2eApplication } from './support/e2e-application';

describe('Application root endpoint over HTTP', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createE2eApplication();
  });

  it('responds with HTTP 200 and the welcome message for GET /', () => {
    return request(app.getHttpServer())
      .get('/api/')
      .expect(200)
      .expect('x-request-id', /^[0-9a-f-]{36}$/u)
      .expect({ message: 'Hello World!' });
  });

  it('reuses an incoming request ID and returns it to the client', () => {
    return request(app.getHttpServer())
      .get('/api/')
      .set('x-request-id', 'frontend-request-1')
      .expect(200)
      .expect('x-request-id', 'frontend-request-1');
  });

  afterAll(async () => {
    await app.close();
  });
});
