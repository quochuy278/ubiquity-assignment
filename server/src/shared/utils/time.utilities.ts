import dayjs, { type ConfigType, type Dayjs } from 'dayjs';

export const now = (): Dayjs => dayjs();

export const toIsoDateTime = (value: ConfigType): string => dayjs(value).toISOString();
