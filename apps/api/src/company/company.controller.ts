import { Body, Controller, Get, Patch } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CompanyService } from './company.service';
import { UpdateCompanyDto } from './dto/update-company.dto';

@Controller('company')
export class CompanyController {
  constructor(private readonly companies: CompanyService) {}

  @Get()
  getMine(@CurrentUser() user: AuthenticatedUser) {
    return this.companies.getMine(user);
  }

  @Patch()
  @Roles('ADMINISTRADOR')
  updateMine(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateCompanyDto,
  ) {
    return this.companies.updateMine(user, dto);
  }
}
