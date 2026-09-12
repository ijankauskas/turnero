import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateServicePackageDto {
  @IsUUID()
  serviceId!: string;

  @IsString()
  name!: string;

  @Type(() => Number)
  @IsInt()
  @Min(2)
  sessionCount!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  validityDays?: number | null;
}

export class UpdateServicePackageDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2)
  sessionCount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  validityDays?: number | null;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class SellClientPackageDto {
  @IsUUID()
  servicePackageId!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
