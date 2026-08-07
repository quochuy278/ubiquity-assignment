import type { Logform } from 'winston';
import { createDevelopmentFormatter } from '../../../../src/common/logger/formatters/development.formatter';
import {
  createLogTimestamp,
  getSystemTimeZone,
} from '../../../../src/common/logger/formatters/formatter.utilities';
import { createProductionFormatter } from '../../../../src/common/logger/formatters/production.formatter';

const MESSAGE = Symbol.for('message');
const TEST_TIME_ZONE = 'Europe/Amsterdam';

function transform(
  formatter: ReturnType<typeof createDevelopmentFormatter>,
  info: Logform.TransformableInfo,
): string {
  const transformed = formatter.transform(info, formatter.options);

  if (typeof transformed !== 'object' || transformed === null) {
    throw new Error('Formatter did not produce a log message');
  }

  if (typeof transformed[MESSAGE] !== 'string') {
    throw new Error('Formatter did not produce a log message');
  }

  return transformed[MESSAGE];
}

describe('Logger output formatting across runtime environments', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-08-07T12:30:15.123Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders colored, readable development logs with context and metadata', () => {
    const output = transform(createDevelopmentFormatter(TEST_TIME_ZONE), {
      level: 'info',
      message: 'User logged in',
      context: 'AuthService',
      metadata: { requestId: 'request-1', userId: 42 },
    });

    expect(output).toContain('\u001B[');
    expect(output).toContain('INFO');
    expect(output).toContain('AuthService');
    expect(output).toContain('***** User logged in *****');
    expect(output).toContain("requestId: 'request-1'");
    expect(output).toContain('2026-08-07T14:30:15.123+02:00 [Europe/Amsterdam]');
  });

  it('uses the hosting system timezone when no formatter override is provided', () => {
    const output = transform(createDevelopmentFormatter(), {
      level: 'info',
      message: 'System timezone detected',
      context: 'Bootstrap',
    });

    expect(output).toContain(`[${getSystemTimeZone()}]`);
  });

  it('preserves error stacks in development logs', () => {
    const stack = 'Error: Payment failed\n    at PaymentService.charge';
    const output = transform(createDevelopmentFormatter(TEST_TIME_ZONE), {
      level: 'error',
      message: 'Payment failed',
      context: 'PaymentService',
      metadata: {},
      stack,
    });

    expect(output).toContain('Error: Payment failed');
    expect(output).toContain('at PaymentService.charge');
  });

  it('renders structured production JSON without ANSI codes', () => {
    const formatter = createProductionFormatter(TEST_TIME_ZONE);
    const output = transform(formatter, {
      level: 'error',
      message: 'Payment failed',
      context: 'PaymentService',
      metadata: { paymentId: 'payment-1' },
      stack: 'Error: Payment failed',
    });
    const parsed = JSON.parse(output) as Record<string, unknown>;

    expect(output).not.toContain('\u001B[');
    expect(parsed).toMatchObject({
      level: 'error',
      message: '***** Payment failed *****',
      context: 'PaymentService',
      metadata: { paymentId: 'payment-1' },
      stack: 'Error: Payment failed',
      timezone: TEST_TIME_ZONE,
    });
    expect(parsed.timestamp).toBe('2026-08-07T14:30:15.123+02:00');
  });
});

describe('Timezone-aware log timestamp formatting', () => {
  it('uses the daylight-saving offset for Europe/Amsterdam during summer', () => {
    const timestamp = createLogTimestamp(new Date('2026-08-07T12:30:15.123Z'), TEST_TIME_ZONE);

    expect(timestamp).toBe('2026-08-07T14:30:15.123+02:00');
  });

  it('uses the standard-time offset for Europe/Amsterdam during winter', () => {
    const timestamp = createLogTimestamp(new Date('2026-01-07T12:30:15.123Z'), TEST_TIME_ZONE);

    expect(timestamp).toBe('2026-01-07T13:30:15.123+01:00');
  });
});
