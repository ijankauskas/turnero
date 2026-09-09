import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateServiceDto, UpdateServiceDto } from './dto/service.dto';
import { ServicesService } from './services.service';

@Controller('services')
export class ServicesController {
  constructor(private readonly services: ServicesService) {}

  @Get()
  @Roles('ADMINISTRADOR', 'ENCARGADO', 'RECEPCION')
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.services.list(user);
  }

  @Post()
  @Roles('ADMINISTRADOR')
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateServiceDto,
  ) {
    return this.services.create(user, dto);
  }

  @Patch(':id')
  @Roles('ADMINISTRADOR')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateServiceDto,
  ) {
    return this.services.update(user, id, dto);
  }
}
