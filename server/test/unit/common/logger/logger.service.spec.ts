import type { Logger } from 'winston';
import { ApplicationLoggerService } from '../../../../src/common/logger/logger.service';
import { RequestContextService } from '../../../../src/common/request-context/request-context.service';

describe('Application logger structured output', () => {
  const winstonLog = jest.fn();
  const winstonLogger = { log: winstonLog } as unknown as Logger;
  const requestContext = new RequestContextService();
  const logger = new ApplicationLoggerService(winstonLogger, requestContext);

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

  it('automatically adds the active request ID to every log entry', async () => {
    await requestContext.run({ requestId: 'request-from-context' }, async () => {
      await Promise.resolve();
      logger.log('Task created', 'TaskService', {
        requestId: 'incorrect-manual-request-id',
        taskId: 'task-1',
      });
    });

    expect(winstonLog).toHaveBeenCalledWith({
      level: 'info',
      message: 'Task created',
      context: 'TaskService',
      metadata: {
        requestId: 'request-from-context',
        taskId: 'task-1',
      },
    });
  });
});
