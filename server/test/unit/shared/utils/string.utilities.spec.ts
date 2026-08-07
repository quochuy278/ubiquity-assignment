import { trimString } from '../../../../src/shared/utils/string.utilities';

describe('Shared string normalization utilities', () => {
  it('trims surrounding whitespace from string values', () => {
    expect(trimString('  Alex  ')).toBe('Alex');
  });

  it.each([null, undefined, 42, { value: ' Alex ' }])(
    'preserves the non-string value %j',
    (value) => {
      expect(trimString(value)).toBe(value);
    },
  );
});
