import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { REMUNERATION_TYPES } from '@turnero/shared';

export class CreateProfessionalDto {
  @IsUUID()
  userId!: string;

  @IsString()
  displayName!: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  branchIds?: string[];
}

export class UpdateProfessionalDto {
  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsString()
  title?: string | null;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class PutBranchesDto {
  @IsArray()
  @IsUUID('4', { each: true })
  branchIds!: string[];

  @IsOptional()
  @IsUUID()
  primaryBranchId?: string;
}

export class ScheduleBlockDto {
  @IsInt()
  @Min(0)
  @Max(6)
  weekday!: number;

  @IsUUID()
  branchId!: string;

  @Matches(/^\d{2}:\d{2}$/)
  startTime!: string;

  @Matches(/^\d{2}:\d{2}$/)
  endTime!: string;

  @IsOptional()
  @IsBoolean()
  isOff?: boolean;
}

export class PutScheduleDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScheduleBlockDto)
  blocks!: ScheduleBlockDto[];
}

export class ProfessionalServiceItemDto {
  @IsUUID()
  serviceId!: string;

  @IsOptional()
  @IsNumber()
  price?: number;

  @IsIn(REMUNERATION_TYPES)
  remunerationType!: 'PERCENT' | 'FIXED';

  @IsNumber()
  remunerationValue!: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class PutProfessionalServicesDto {
  @IsArray()
  @ArrayMinSize(0)
  @ValidateNested({ each: true })
  @Type(() => ProfessionalServiceItemDto)
  items!: ProfessionalServiceItemDto[];
}
