import { format, type Logform } from 'winston';
import { createLogTimestamp, formatLogMessage, getSystemTimeZone } from './formatter.utilities';

export function createProductionFormatter(timeZone = getSystemTimeZone()): Logform.Format {
  const decorateMessage = format((info) => {
    info.message = formatLogMessage(info.message);
    info.timezone = timeZone;

    return info;
  });

  return format.combine(
    format.errors({ stack: true }),
    format.timestamp({ format: () => createLogTimestamp(new Date(), timeZone) }),
    decorateMessage(),
    format.json(),
  );
}
