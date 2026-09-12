import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ClientsService } from './clients.service';
import { CreateClientDto, UpdateClientDto } from './dto/client.dto';

@Controller('clients')
export class ClientsController {
  constructor(private readonly clients: ClientsService) {}

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query('query') query?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.clients.list(user, query, page, pageSize);
  }

  @Post()
  @Roles('ADMINISTRADOR', 'ENCARGADO', 'RECEPCION')
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateClientDto,
  ) {
    return this.clients.create(user, dto);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.clients.get(user, id);
  }

  @Patch(':id')
  @Roles('ADMINISTRADOR', 'ENCARGADO', 'RECEPCION')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateClientDto,
  ) {
    return this.clients.update(user, id, dto);
  }

  @Post(':id/deactivate')
  @Roles('ADMINISTRADOR', 'ENCARGADO', 'RECEPCION')
  deactivate(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.clients.update(user, id, { active: false });
  }
}
