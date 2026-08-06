import type { Logger } from 'winston';
import { ApplicationLoggerService } from '../../../../src/common/logger/logger.service';

describe('ApplicationLoggerService', () => {
  const winstonLog = jest.fn();
  const winstonLogger = { log: winstonLog } as unknown as Logger;
  const logger = new ApplicationLoggerService(winstonLogger);

  beforeEach(() => {
    winstonLog.mockClear();
  });

  it('writes context and optional metadata as structured fields', () => {
    logger.log('User logged in', 'AuthService', {
      requestId: 'request-1',
      userId: 42,
    });

    expect(winstonLog).toHaveBeenCalledWith({
      level: 'info',
      message: 'User logged in',
      context: 'AuthService',
      metadata: {
        requestId: 'request-1',
        userId: 42,
      },
    });
  });

  it('preserves an error stack and context', () => {
    const stack = 'Error: Payment failed\n    at PaymentService.charge';

    logger.error('Payment failed', stack, 'PaymentService');

    expect(winstonLog).toHaveBeenCalledWith({
      level: 'error',
      message: 'Payment failed',
      context: 'PaymentService',
      metadata: {},
      stack,
    });
  });
});
