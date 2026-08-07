const MESSAGE_SEPARATOR = '*****';

export function formatLogMessage(message: unknown): string {
  return `${MESSAGE_SEPARATOR} ${String(message)} ${MESSAGE_SEPARATOR}`;
}

export function getSystemTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function createLogTimestamp(date = new Date(), timeZone = getSystemTimeZone()): string {
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
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const offset = values.timeZoneName === 'GMT' ? '+00:00' : values.timeZoneName?.slice(3);

  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}:${values.second}.${values.fractionalSecond}${offset}`;
}
