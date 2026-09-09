import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import {
  CreateProfessionalDto,
  PutBranchesDto,
  PutProfessionalServicesDto,
  PutScheduleDto,
  UpdateProfessionalDto,
} from './dto/professional.dto';
import { ProfessionalsService } from './professionals.service';

@Controller('professionals')
export class ProfessionalsController {
  constructor(private readonly professionals: ProfessionalsService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.professionals.list(user);
  }

  @Get(':id/schedule')
  @Roles('ADMINISTRADOR', 'ENCARGADO', 'PROFESIONAL')
  getSchedule(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.professionals.getSchedule(user, id);
  }

  @Put(':id/schedule')
  @Roles('ADMINISTRADOR')
  putSchedule(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: PutScheduleDto,
  ) {
    return this.professionals.replaceSchedule(user, id, dto);
  }

  @Get(':id/services')
  getServices(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.professionals.getServicesMatrix(user, id);
  }

  @Put(':id/services')
  @Roles('ADMINISTRADOR')
  putServices(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: PutProfessionalServicesDto,
  ) {
    return this.professionals.replaceServices(user, id, dto);
  }

  @Put(':id/branches')
  @Roles('ADMINISTRADOR')
  putBranches(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: PutBranchesDto,
  ) {
    return this.professionals.replaceBranches(user, id, dto);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.professionals.get(user, id);
  }

  @Post()
  @Roles('ADMINISTRADOR')
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateProfessionalDto,
  ) {
    return this.professionals.create(user, dto);
  }

  @Patch(':id')
  @Roles('ADMINISTRADOR')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateProfessionalDto,
  ) {
    return this.professionals.update(user, id, dto);
  }
}
