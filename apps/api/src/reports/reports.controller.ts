import { Controller, Get, Query } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('professionals')
  @Roles('ADMINISTRADOR', 'ENCARGADO')
  professionals(
    @CurrentUser() user: AuthenticatedUser,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.reports.professionals(user, { from, to, branchId });
  }

  @Get('daily')
  @Roles('ADMINISTRADOR', 'ENCARGADO', 'RECEPCION')
  daily(
    @CurrentUser() user: AuthenticatedUser,
    @Query('date') date: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.reports.daily(user, { date, branchId });
  }

  @Get('live')
  @Roles('ADMINISTRADOR', 'ENCARGADO', 'RECEPCION')
  live(
    @CurrentUser() user: AuthenticatedUser,
    @Query('date') date: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.reports.live(user, { date, branchId });
  }
}
