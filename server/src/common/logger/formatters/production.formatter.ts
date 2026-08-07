import { format, type Logform } from 'winston';
import { createLogTimestamp, formatLogMessage, getSystemTimeZone } from './formatter.utilities';

export function createProductionFormatter(timeZone = getSystemTimeZone()): Logform.Format {
  const decorateMessage = format((info) => {
    info.message = formatLogMessage(info.message);
    info.timezone = timeZone;

    if (typeof info.metadata === 'object' && info.metadata !== null) {
      const metadata = info.metadata as Record<string, unknown>;

      if (typeof metadata.requestId === 'string') {
        info.requestId = metadata.requestId;
        const { requestId: _requestId, ...remainingMetadata } = metadata;
        info.metadata = remainingMetadata;
      }
    }

    return info;
  });

  return format.combine(
    format.errors({ stack: true }),
    format.timestamp({ format: () => createLogTimestamp({ timeZone }) }),
    decorateMessage(),
    format.json(),
  );
}
