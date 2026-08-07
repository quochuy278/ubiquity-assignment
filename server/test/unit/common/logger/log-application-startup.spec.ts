import {
  createStartupDisplayUrl,
  logApplicationStartup,
} from '../../../../src/common/logger/log-application-startup';
import type { ApplicationLoggerService } from '../../../../src/common/logger/logger.service';

describe('Application startup logging', () => {
  const log = jest.fn();
  const success = jest.fn();
  const logger = { log, success } as unknown as ApplicationLoggerService;
  const startupDetails = {
    environment: 'development',
    url: 'http://localhost:3000',
    swaggerUrl: 'http://localhost:3000/api/docs',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('writes one structured startup event and readable endpoint URLs during development', () => {
    logApplicationStartup(logger, startupDetails);

    expect(success).toHaveBeenCalledWith(
      'Application started successfully',
      'Bootstrap',
      startupDetails,
    );
    expect(success).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenNthCalledWith(1, 'Listening on: http://localhost:3000', 'Bootstrap');
    expect(log).toHaveBeenNthCalledWith(2, 'Swagger: http://localhost:3000/api/docs', 'Bootstrap');
    expect(log).toHaveBeenCalledTimes(2);
  });

  it('writes only the structured startup event in production to reduce log noise', () => {
    const productionDetails = { ...startupDetails, environment: 'production' };

    logApplicationStartup(logger, productionDetails);

    expect(success).toHaveBeenCalledWith(
      'Application started successfully',
      'Bootstrap',
      productionDetails,
    );
    expect(success).toHaveBeenCalledTimes(1);
    expect(log).not.toHaveBeenCalled();
  });
});

describe('Human-readable startup URL formatting', () => {
  it.each([
    ['the IPv6 loopback address', 'http://[::1]:3000'],
    ['the IPv6 unspecified bind address', 'http://[::]:3000'],
    ['the IPv4 loopback address', 'http://127.0.0.1:3000'],
    ['the IPv4 unspecified bind address', 'http://0.0.0.0:3000'],
  ])('replaces %s with localhost for display', (_scenario, applicationUrl) => {
    expect(createStartupDisplayUrl(applicationUrl)).toBe('http://localhost:3000');
  });

  it('preserves a host URL that clients can already use', () => {
    expect(createStartupDisplayUrl('https://api.example.com:8443')).toBe(
      'https://api.example.com:8443',
    );
  });
});
