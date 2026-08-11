import { getProductionAblyKey } from '@/config/ably-key';

describe('production Ably key', () => {
  it('accepts and trims a configured key', () => {
    expect(getProductionAblyKey(' app.key:secret ')).toBe('app.key:secret');
  });

  it.each([undefined, '', '   '])('rejects a missing key', (value) => {
    expect(() => getProductionAblyKey(value)).toThrow('ABLY_KEY is required in production');
  });
});
