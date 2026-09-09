import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import type { AppointmentStatus } from '@turnero/shared';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AppointmentsService } from './appointments.service';
import {
  CancelAppointmentDto,
  CreateAppointmentDto,
  PaidAppointmentDto,
  StatusAppointmentDto,
  UpdateAppointmentDto,
} from './dto/appointment.dto';

@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointments: AppointmentsService) {}

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('date') date?: string,
    @Query('branchId') branchId?: string,
    @Query('professionalId') professionalId?: string,
    @Query('status') status?: AppointmentStatus,
  ) {
    return this.appointments.list(user, {
      from,
      to,
      date,
      branchId,
      professionalId,
      status,
    });
  }

  @Get('availability')
  availability(
    @CurrentUser() user: AuthenticatedUser,
    @Query('professionalId') professionalId: string,
    @Query('branchId') branchId: string,
    @Query('date') date: string,
    @Query('serviceId') serviceId: string,
  ) {
    return this.appointments.availability(user, {
      professionalId,
      branchId,
      date,
      serviceId,
    });
  }

  @Get(':id/whatsapp-link')
  whatsapp(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.appointments.whatsappLink(user, id);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.appointments.get(user, id);
  }

  @Post()
  @Roles('ADMINISTRADOR', 'ENCARGADO', 'RECEPCION')
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateAppointmentDto,
  ) {
    return this.appointments.create(user, dto);
  }

  @Patch(':id')
  @Roles('ADMINISTRADOR', 'ENCARGADO', 'RECEPCION')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateAppointmentDto,
  ) {
    return this.appointments.update(user, id, dto);
  }

  @Post(':id/cancel')
  @Roles('ADMINISTRADOR', 'ENCARGADO', 'RECEPCION')
  cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CancelAppointmentDto,
  ) {
    return this.appointments.cancel(user, id, dto);
  }

  @Post(':id/status')
  @Roles('ADMINISTRADOR', 'ENCARGADO', 'RECEPCION')
  status(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: StatusAppointmentDto,
  ) {
    return this.appointments.setStatus(user, id, dto.status);
  }

  @Post(':id/paid')
  @Roles('ADMINISTRADOR', 'ENCARGADO', 'RECEPCION')
  paid(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: PaidAppointmentDto,
  ) {
    return this.appointments.setPaid(user, id, dto.paid);
  }
}
