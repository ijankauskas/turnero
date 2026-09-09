import { IsOptional, IsString, IsUUID, Matches } from 'class-validator';

export class UpsertNoteDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date!: string;

  @IsUUID()
  branchId!: string;

  @IsString()
  body!: string;
}

export class NoteQueryDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date!: string;

  @IsOptional()
  @IsUUID()
  branchId?: string;
}
