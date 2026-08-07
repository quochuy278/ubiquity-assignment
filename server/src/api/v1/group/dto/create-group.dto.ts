import { ApiProperty } from '@nestjs/swagger';
import { Transform, type TransformFnParams } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { trimString } from '../../../../shared/utils/string.utilities';
import { GroupType } from '../group.constants';

export class CreateGroupDto {
  @ApiProperty({ type: 'string', enum: GroupType, enumName: 'GroupType' })
  @IsEnum(GroupType)
  type: GroupType;

  @ApiProperty({ type: String, example: 'Family' })
  @Transform(({ value }: TransformFnParams) => trimString(value))
  @IsString()
  @IsNotEmpty()
  name: string;
}
