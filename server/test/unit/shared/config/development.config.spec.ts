import developmentConfiguration from '../../../../src/shared/config/environments/development.config';

describe('Development environment configuration', () => {
  const originalEnvironment = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnvironment,
      NODE_ENV: 'development',
      DATABASE_URL: 'postgresql://development/database',
      DIRECT_URL: 'postgresql://development/direct',
      ABLY_KEY: 'development-app.development-key:development-secret',
    };
    delete process.env.CORS_ORIGIN;
  });

  afterAll(() => {
    process.env = originalEnvironment;
  });

  it('allows all browser origins by default', () => {
    expect(developmentConfiguration()).toMatchObject({
      app: { corsOrigin: '*' },
    });
  });
});
