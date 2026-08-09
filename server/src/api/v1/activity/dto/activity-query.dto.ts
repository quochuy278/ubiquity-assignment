import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { DEFAULT_ACTIVITY_PAGE_SIZE, MAX_ACTIVITY_PAGE_SIZE } from '../activity.constants';

export class ActivityQueryDto {
  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_ACTIVITY_PAGE_SIZE)
  limit: number = DEFAULT_ACTIVITY_PAGE_SIZE;
}
