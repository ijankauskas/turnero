import { Body, Controller, Get, Put, Query } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UpsertNoteDto } from './dto/note.dto';
import { NotesService } from './notes.service';

@Controller('notes')
export class NotesController {
  constructor(private readonly notes: NotesService) {}

  @Get()
  @Roles('ADMINISTRADOR', 'ENCARGADO', 'RECEPCION')
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Query('date') date: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.notes.get(user, date, branchId);
  }

  @Put()
  @Roles('ADMINISTRADOR', 'ENCARGADO', 'RECEPCION')
  upsert(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpsertNoteDto) {
    return this.notes.upsert(user, dto);
  }
}
