import { APPOINTMENT_STATUSES, type AppointmentStatus } from '@turnero/shared';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateAppointmentDto {
  @IsUUID()
  branchId!: string;

  @IsUUID()
  professionalId!: string;

  @IsUUID()
  clientId!: string;

  @IsUUID()
  serviceId!: string;

  @IsDateString()
  startAt!: string;

  @IsOptional()
  @IsBoolean()
  paid?: boolean;

  @IsOptional()
  @IsString()
  observations?: string;

  @IsOptional()
  @IsString()
  internalNotes?: string;
}

export class UpdateAppointmentDto {
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @IsUUID()
  professionalId?: string;

  @IsOptional()
  @IsUUID()
  clientId?: string;

  @IsOptional()
  @IsUUID()
  serviceId?: string;

  @IsOptional()
  @IsDateString()
  startAt?: string;

  @IsOptional()
  @IsBoolean()
  paid?: boolean;

  @IsOptional()
  @IsString()
  observations?: string | null;

  @IsOptional()
  @IsString()
  internalNotes?: string | null;
}

export class CancelAppointmentDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

export class StatusAppointmentDto {
  @IsIn(APPOINTMENT_STATUSES)
  status!: AppointmentStatus;
}

export class PaidAppointmentDto {
  @Type(() => Boolean)
  @IsBoolean()
  paid!: boolean;
}

export class SetPriceAppointmentDto {
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  price!: number;
}
