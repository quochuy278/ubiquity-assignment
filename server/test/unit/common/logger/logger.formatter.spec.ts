import type { Logform } from 'winston';
import { createDevelopmentFormatter } from '../../../../src/common/logger/formatters/development.formatter';
import { createProductionFormatter } from '../../../../src/common/logger/formatters/production.formatter';

const MESSAGE = Symbol.for('message');

function transform(
  formatter: ReturnType<typeof createDevelopmentFormatter>,
  info: Logform.TransformableInfo,
): string {
  const transformed = formatter.transform(info, formatter.options);

  if (!transformed || typeof transformed[MESSAGE] !== 'string') {
    throw new Error('Formatter did not produce a log message');
  }

  return transformed[MESSAGE];
}

describe('logger formatters', () => {
  it('renders colored, readable development logs with context and metadata', () => {
    const output = transform(createDevelopmentFormatter(), {
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
    expect(output).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}[+-]\d{2}:\d{2}/u);
  });

  it('preserves error stacks in development logs', () => {
    const stack = 'Error: Payment failed\n    at PaymentService.charge';
    const output = transform(createDevelopmentFormatter(), {
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
    const formatter = createProductionFormatter();
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
    });
    expect(parsed.timestamp).toEqual(expect.any(String));
    expect(parsed.timestamp).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}[+-]\d{2}:\d{2}$/u,
    );
  });
});
