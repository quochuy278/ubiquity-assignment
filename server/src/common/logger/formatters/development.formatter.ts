import { inspect } from 'node:util';
import { format, type Logform } from 'winston';
import {
  LOGGER_CONTEXT_COLUMN_WIDTH,
  LOGGER_DEVELOPMENT_COLORS,
  LOGGER_LEVEL_COLORS,
  LOGGER_LEVEL_COLUMN_WIDTH,
  LOGGER_LEVEL_LABELS,
  type LoggerLevel,
} from '../logger.constants';
import { createLogTimestamp, formatLogMessage, getSystemTimeZone } from './formatter.utilities';

function toDisplayValue(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  return inspect(value, {
    breakLength: Number.POSITIVE_INFINITY,
    colors: false,
    compact: true,
    depth: 5,
  });
}

function isLoggerLevel(level: string): level is LoggerLevel {
  return level in LOGGER_LEVEL_LABELS;
}

function hasMetadata(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && Object.keys(value).length > 0;
}

export function createDevelopmentFormatter(timeZone = getSystemTimeZone()): Logform.Format {
  return format.combine(
    format.timestamp({ format: () => createLogTimestamp({ timeZone }) }),
    format.printf((info) => {
      const rawLevel = info.level;
      const level = isLoggerLevel(rawLevel) ? rawLevel : 'info';
      const timestamp = typeof info.timestamp === 'string' ? info.timestamp : '--:--:--';
      const context = typeof info.context === 'string' ? info.context : '-';
      const message = formatLogMessage(toDisplayValue(info.message));
      const metadata = hasMetadata(info.metadata) ? ` ${toDisplayValue(info.metadata)}` : '';
      const stack = typeof info.stack === 'string' ? `\n${info.stack}` : '';

      const timestampColumn = LOGGER_DEVELOPMENT_COLORS.timestamp(`${timestamp} [${timeZone}]`);
      const levelColumn = LOGGER_LEVEL_COLORS[level](
        LOGGER_LEVEL_LABELS[level].padEnd(LOGGER_LEVEL_COLUMN_WIDTH),
      );
      const contextColumn = LOGGER_DEVELOPMENT_COLORS.context(
        context.padEnd(LOGGER_CONTEXT_COLUMN_WIDTH),
      );

      return `${timestampColumn} ${levelColumn} ${contextColumn} ${message}${LOGGER_DEVELOPMENT_COLORS.metadata(metadata)}${LOGGER_DEVELOPMENT_COLORS.stack(stack)}`;
    }),
  );
}
