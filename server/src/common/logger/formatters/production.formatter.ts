import { format, type Logform } from 'winston';
import { createLogTimestamp, formatLogMessage } from './formatter.utilities';

export function createProductionFormatter(): Logform.Format {
  const decorateMessage = format((info) => {
    info.message = formatLogMessage(info.message);

    return info;
  });

  return format.combine(
    format.errors({ stack: true }),
    format.timestamp({ format: createLogTimestamp }),
    decorateMessage(),
    format.json(),
  );
}
