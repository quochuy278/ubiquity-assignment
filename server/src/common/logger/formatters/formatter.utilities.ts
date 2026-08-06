const MESSAGE_SEPARATOR = '*****';

function pad(value: number, length = 2): string {
  return value.toString().padStart(length, '0');
}

export function formatLogMessage(message: unknown): string {
  return `${MESSAGE_SEPARATOR} ${String(message)} ${MESSAGE_SEPARATOR}`;
}

export function createLogTimestamp(): string {
  const date = new Date();
  const offsetMinutes = -date.getTimezoneOffset();
  const offsetSign = offsetMinutes >= 0 ? '+' : '-';
  const absoluteOffsetMinutes = Math.abs(offsetMinutes);
  const offsetHours = Math.floor(absoluteOffsetMinutes / 60);
  const offsetRemainingMinutes = absoluteOffsetMinutes % 60;

  return [
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`,
    `${offsetSign}${pad(offsetHours)}:${pad(offsetRemainingMinutes)}`,
  ].join('');
}
