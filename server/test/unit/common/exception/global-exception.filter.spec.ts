import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../../../../src/common/exception/error-code';
import { GlobalException } from '../../../../src/common/exception/global.exception';
import { GlobalExceptionFilter } from '../../../../src/common/exception/global-exception.filter';
import { createExceptionFilterTestHarness } from '../../../utils/exception-filter-test-harness';

describe('GlobalExceptionFilter HTTP boundary behavior', () => {
  let harness: ReturnType<typeof createExceptionFilterTestHarness>;
  let filter: GlobalExceptionFilter;

  beforeEach(() => {
    harness = createExceptionFilterTestHarness();
    filter = new GlobalExceptionFilter(harness.adapterHost, harness.logger);
  });

  it.each([
    {
      scenario: 'a requested task does not exist',
      code: ErrorCode.TASK_NOT_FOUND,
      status: HttpStatus.NOT_FOUND,
      errorContext: { taskId: 'task-1' },
    },
    {
      scenario: 'a requested group does not exist',
      code: ErrorCode.GROUP_NOT_FOUND,
      status: HttpStatus.NOT_FOUND,
      errorContext: { groupId: 'group-1' },
    },
    {
      scenario: 'an email address is already registered',
      code: ErrorCode.EMAIL_ALREADY_REGISTERED,
      status: HttpStatus.CONFLICT,
      errorContext: { email: 'alex@example.com' },
    },
    {
      scenario: 'login credentials are invalid',
      code: ErrorCode.INVALID_CREDENTIALS,
      status: HttpStatus.UNAUTHORIZED,
      errorContext: {},
    },
    {
      scenario: 'an access token is missing or invalid',
      code: ErrorCode.UNAUTHORIZED,
      status: HttpStatus.UNAUTHORIZED,
      errorContext: {},
    },
    {
      scenario: 'a refresh token is invalid or expired',
      code: ErrorCode.INVALID_REFRESH_TOKEN,
      status: HttpStatus.UNAUTHORIZED,
      errorContext: {},
    },
  ])(
    'returns $code with HTTP $status without logging or exposing context when $scenario',
    ({ code, status, errorContext }) => {
      filter.catch(new GlobalException(code, errorContext), harness.host);

      expect(harness.reply).toHaveBeenCalledWith(harness.response, { code }, status);
      expect(harness.reply).toHaveBeenCalledTimes(1);
      expect(harness.loggerError).not.toHaveBeenCalled();
    },
  );

  it('returns safe field-level messages when request validation fails', () => {
    const errors = [
      {
        field: 'password',
        messages: ['password must be longer than or equal to 8 characters'],
      },
      {
        field: 'displayName',
        messages: ['displayName must be a string'],
      },
    ];

    filter.catch(
      new GlobalException(ErrorCode.VALIDATION_ERROR, {
        errors,
        internalContext: 'must-not-be-exposed',
      }),
      harness.host,
    );

    expect(harness.reply).toHaveBeenCalledWith(
      harness.response,
      { code: ErrorCode.VALIDATION_ERROR, errors },
      HttpStatus.BAD_REQUEST,
    );
    expect(harness.loggerError).not.toHaveBeenCalled();
  });

  it('returns an empty error list when validation context has an unexpected shape', () => {
    filter.catch(
      new GlobalException(ErrorCode.VALIDATION_ERROR, {
        errors: [{ field: 'password', messages: 'unsafe-shape' }],
      }),
      harness.host,
    );

    expect(harness.reply).toHaveBeenCalledWith(
      harness.response,
      { code: ErrorCode.VALIDATION_ERROR, errors: [] },
      HttpStatus.BAD_REQUEST,
    );
  });

  it('preserves a framework 4xx response without logging it as an application failure', () => {
    const exception = new HttpException('Forbidden', HttpStatus.FORBIDDEN);

    filter.catch(exception, harness.host);

    expect(harness.reply).toHaveBeenCalledWith(harness.response, 'Forbidden', HttpStatus.FORBIDDEN);
    expect(harness.loggerError).not.toHaveBeenCalled();
  });

  it('preserves a framework 5xx response and logs the failure exactly once', () => {
    const body = { statusCode: 503, message: 'Service unavailable' };
    const exception = new HttpException(body, HttpStatus.SERVICE_UNAVAILABLE);

    filter.catch(exception, harness.host);

    expect(harness.reply).toHaveBeenCalledWith(
      harness.response,
      body,
      HttpStatus.SERVICE_UNAVAILABLE,
    );
    expect(harness.loggerError).toHaveBeenCalledTimes(1);
    expect(harness.loggerError).toHaveBeenCalledWith(exception, GlobalExceptionFilter.name, {
      method: 'GET',
      path: '/api/tasks/task-1',
    });
  });

  it('returns a safe internal error response and logs an unexpected Error instance', () => {
    const exception = new Error('Database password leaked here');

    filter.catch(exception, harness.host);

    expect(harness.reply).toHaveBeenCalledWith(
      harness.response,
      { code: ErrorCode.INTERNAL_ERROR },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
    expect(harness.loggerError).toHaveBeenCalledWith(exception, GlobalExceptionFilter.name, {
      method: 'GET',
      path: '/api/tasks/task-1',
    });
  });

  it('normalizes and logs a thrown non-Error value without exposing it to the client', () => {
    filter.catch('database-password', harness.host);

    expect(harness.reply).toHaveBeenCalledWith(
      harness.response,
      { code: ErrorCode.INTERNAL_ERROR },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
    expect(harness.loggerError).toHaveBeenCalledTimes(1);
    expect(harness.loggerError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'database-password' }),
      GlobalExceptionFilter.name,
      { method: 'GET', path: '/api/tasks/task-1' },
    );
  });

  it('logs an internal application error once using its cause and trusted request context', () => {
    const cause = new Error('Database connection failed');
    const exception = new GlobalException(
      ErrorCode.INTERNAL_ERROR,
      {
        taskId: 'task-1',
        method: 'SPOOFED_METHOD',
        path: '/spoofed-path',
      },
      { cause },
    );

    filter.catch(exception, harness.host);

    expect(harness.reply).toHaveBeenCalledWith(
      harness.response,
      { code: ErrorCode.INTERNAL_ERROR },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
    expect(harness.loggerError).toHaveBeenCalledTimes(1);
    expect(harness.loggerError).toHaveBeenCalledWith(cause, GlobalExceptionFilter.name, {
      taskId: 'task-1',
      errorCode: ErrorCode.INTERNAL_ERROR,
      method: 'GET',
      path: '/api/tasks/task-1',
    });
  });
});
