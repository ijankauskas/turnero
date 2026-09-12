import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import {
  CreateServicePackageDto,
  SellClientPackageDto,
  UpdateServicePackageDto,
} from './dto/package.dto';
import { PackagesService } from './packages.service';

@Controller()
export class PackagesController {
  constructor(private readonly packages: PackagesService) {}

  @Get('service-packages')
  @Roles('ADMINISTRADOR', 'ENCARGADO', 'RECEPCION')
  listCatalog(
    @CurrentUser() user: AuthenticatedUser,
    @Query('serviceId') serviceId?: string,
  ) {
    return this.packages.listCatalog(user, serviceId);
  }

  @Post('service-packages')
  @Roles('ADMINISTRADOR')
  createCatalog(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateServicePackageDto,
  ) {
    return this.packages.createCatalog(user, dto);
  }

  @Patch('service-packages/:id')
  @Roles('ADMINISTRADOR')
  updateCatalog(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateServicePackageDto,
  ) {
    return this.packages.updateCatalog(user, id, dto);
  }

  @Get('clients/:clientId/packages')
  @Roles('ADMINISTRADOR', 'ENCARGADO', 'RECEPCION')
  listForClient(
    @CurrentUser() user: AuthenticatedUser,
    @Param('clientId') clientId: string,
  ) {
    return this.packages.listForClient(user, clientId);
  }

  @Get('clients/:clientId/packages/available')
  @Roles('ADMINISTRADOR', 'ENCARGADO', 'RECEPCION')
  available(
    @CurrentUser() user: AuthenticatedUser,
    @Param('clientId') clientId: string,
    @Query('serviceId') serviceId: string,
  ) {
    return this.packages.availableForClientService(user, clientId, serviceId);
  }

  @Post('clients/:clientId/packages')
  @Roles('ADMINISTRADOR', 'ENCARGADO', 'RECEPCION')
  sell(
    @CurrentUser() user: AuthenticatedUser,
    @Param('clientId') clientId: string,
    @Body() dto: SellClientPackageDto,
  ) {
    return this.packages.sellToClient(user, clientId, dto);
  }
}
