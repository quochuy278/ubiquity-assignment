import dayjs from 'dayjs';
import { now, toIsoDateTime } from '../../../../src/shared/utils/time.utilities';

describe('Shared current-time utility', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns the current instant as a Day.js value', () => {
    const currentInstant = dayjs('2026-08-07T12:30:15.123Z');
    jest.useFakeTimers();
    jest.setSystemTime(currentInstant.toDate());

    expect(now().toISOString()).toBe(currentInstant.toISOString());
  });

  it('serializes supported date values to the canonical ISO representation', () => {
    expect(toIsoDateTime(dayjs('2026-08-07T12:30:15.123Z'))).toBe('2026-08-07T12:30:15.123Z');
  });
});
