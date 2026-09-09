import { Module } from '@nestjs/common';
import { TenantModule } from '../tenant/tenant.module';
import { CompanyController } from './company.controller';
import { CompanyService } from './company.service';
import { PublicCompanyController } from './public-company.controller';

@Module({
  imports: [TenantModule],
  controllers: [CompanyController, PublicCompanyController],
  providers: [CompanyService],
})
export class CompanyModule {}
