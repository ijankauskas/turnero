import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { imageUploadOptions } from '../uploads/storage';
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

  @Post('logo')
  @Roles('ADMINISTRADOR')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      ...imageUploadOptions,
    }),
  )
  uploadLogo(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.companies.uploadLogo(user, file);
  }
}
