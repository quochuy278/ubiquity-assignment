import { DEFAULT_API_TIMEOUT_MS, getApiTimeoutMs } from '@/config/api-timeout';

describe('API timeout configuration', () => {
  it('uses a finite default timeout', () => {
    expect(getApiTimeoutMs(undefined)).toBe(DEFAULT_API_TIMEOUT_MS);
    expect(DEFAULT_API_TIMEOUT_MS).toBe(10_000);
  });

  it('accepts a positive integer override', () => {
    expect(getApiTimeoutMs('25000')).toBe(25_000);
  });

  it.each(['', '  ', '0', '-1', 'not-a-number', '1.5'])(
    'falls back to the default for invalid timeout value %s',
    (value) => {
      expect(getApiTimeoutMs(value)).toBe(DEFAULT_API_TIMEOUT_MS);
    },
  );
});
