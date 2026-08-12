import productionConfiguration from '../../../../src/shared/config/environments/production.config';

describe('Production environment configuration', () => {
  const originalEnvironment = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnvironment,
      NODE_ENV: 'production',
      PORT: '3000',
      AUTH_ACCESS_TOKEN_SECRET: 'production-access-token-secret-at-least-32-characters',
      CORS_ORIGIN: 'https://ubiquity-assignment.vercel.app',
      DATABASE_URL: 'postgresql://production/database',
      DIRECT_URL: 'postgresql://production/direct',
      ABLY_KEY: 'production-app.production-key:production-secret',
    };
  });

  afterAll(() => {
    process.env = originalEnvironment;
  });

  it('requires and exposes one explicit frontend origin', () => {
    expect(productionConfiguration()).toMatchObject({
      app: { corsOrigin: 'https://ubiquity-assignment.vercel.app' },
    });

    delete process.env.CORS_ORIGIN;
    expect(() => productionConfiguration()).toThrow('Invalid production environment');
  });
});
