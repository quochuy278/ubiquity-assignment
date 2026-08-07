import { ErrorCode } from '../../../../src/common/exception/error-code';
import { GlobalException } from '../../../../src/common/exception/global.exception';

describe('GlobalException application error metadata', () => {
  it('preserves the semantic error code and server-only diagnostic context', () => {
    const exception = new GlobalException(ErrorCode.TASK_NOT_FOUND, { taskId: 'task-1' });

    expect(exception).toBeInstanceOf(Error);
    expect(exception.name).toBe('GlobalException');
    expect(exception.message).toBe(ErrorCode.TASK_NOT_FOUND);
    expect(exception.code).toBe(ErrorCode.TASK_NOT_FOUND);
    expect(exception.context).toEqual({ taskId: 'task-1' });
  });

  it('preserves the original error cause when no diagnostic context is provided', () => {
    const cause = new Error('Database connection failed');
    const exception = new GlobalException(ErrorCode.INTERNAL_ERROR, undefined, { cause });

    expect(exception.cause).toBe(cause);
    expect(exception.context).toBeUndefined();
  });
});
