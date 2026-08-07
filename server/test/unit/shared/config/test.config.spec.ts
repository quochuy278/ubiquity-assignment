import testConfiguration from '../../../../src/shared/config/environments/test.config';

describe('Test environment configuration', () => {
  const originalEnvironment = process.env;

  beforeEach(() => {
    process.env = { ...originalEnvironment };
    process.env.E2E_AUTH_ACCESS_TOKEN_SECRET = 'test-access-token-secret-at-least-32-characters';
  });

  afterAll(() => {
    process.env = originalEnvironment;
  });

  it('uses only the explicit test database variables', () => {
    process.env.DATABASE_URL = 'postgresql://development/database';
    process.env.DIRECT_URL = 'postgresql://development/direct';
    process.env.E2E_DATABASE_URL = 'postgresql://testing/database';
    process.env.E2E_DIRECT_URL = 'postgresql://testing/direct';

    expect(testConfiguration()).toMatchObject({
      app: { environment: 'test' },
      database: {
        url: 'postgresql://testing/database',
        directUrl: 'postgresql://testing/direct',
      },
    });
  });

  it('does not fall back to development database variables', () => {
    process.env.DATABASE_URL = 'postgresql://development/database';
    process.env.DIRECT_URL = 'postgresql://development/direct';
    delete process.env.E2E_DATABASE_URL;
    delete process.env.E2E_DIRECT_URL;

    expect(() => testConfiguration()).toThrow('Invalid test environment');
  });
});
