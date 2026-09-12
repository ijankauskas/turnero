import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateServiceDto {
  @IsString()
  name!: string;

  @Type(() => Number)
  @IsInt()
  @Min(5)
  durationMinutes!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  basePrice!: number;

  @IsOptional()
  @IsBoolean()
  openPrice?: boolean;
}

export class UpdateServiceDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(5)
  durationMinutes?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  basePrice?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsBoolean()
  openPrice?: boolean;
}
