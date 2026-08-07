import type { Dayjs } from 'dayjs';
import { keyBy } from 'lodash';
import { now } from '../../../shared/utils/time.utilities';

const MESSAGE_SEPARATOR = '*****';

interface LogTimestampOptions {
  date?: Dayjs;
  timeZone?: string;
}

export function formatLogMessage(message: unknown): string {
  return `${MESSAGE_SEPARATOR} ${String(message)} ${MESSAGE_SEPARATOR}`;
}

export function getSystemTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function createLogTimestamp({
  date = now(),
  timeZone = getSystemTimeZone(),
}: LogTimestampOptions = {}): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3,
    timeZoneName: 'longOffset',
    hourCycle: 'h23',
  }).formatToParts(date.toDate());
  const values = keyBy(parts, 'type');
  const offsetName = values.timeZoneName.value;
  const offset = offsetName === 'GMT' ? '+00:00' : offsetName.slice(3);

  return `${values.year.value}-${values.month.value}-${values.day.value}T${values.hour.value}:${values.minute.value}:${values.second.value}.${values.fractionalSecond.value}${offset}`;
}
