import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { BranchesService } from './branches.service';
import { CreateBranchDto, UpdateBranchDto } from './dto/branch.dto';

@Controller('branches')
export class BranchesController {
  constructor(private readonly branches: BranchesService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.branches.list(user);
  }

  @Post()
  @Roles('ADMINISTRADOR')
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateBranchDto,
  ) {
    return this.branches.create(user, dto);
  }

  @Patch(':id')
  @Roles('ADMINISTRADOR')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateBranchDto,
  ) {
    return this.branches.update(user, id, dto);
  }
}
