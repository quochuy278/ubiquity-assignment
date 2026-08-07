import type { INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../../src/app/app.module';

describe('Application root endpoint over HTTP', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('responds with HTTP 200 and the welcome message for GET /', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('x-request-id', /^[0-9a-f-]{36}$/u)
      .expect({ message: 'Hello World!' });
  });

  it('reuses an incoming request ID and returns it to the client', () => {
    return request(app.getHttpServer())
      .get('/')
      .set('x-request-id', 'frontend-request-1')
      .expect(200)
      .expect('x-request-id', 'frontend-request-1');
  });

  afterEach(async () => {
    await app.close();
  });
});
