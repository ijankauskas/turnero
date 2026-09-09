import { Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import { TenantPrismaService } from '../tenant/tenant-prisma.service';
import type { UpdateCompanyDto } from './dto/update-company.dto';

@Injectable()
export class CompanyService {
  constructor(private readonly tenant: TenantPrismaService) {}

  async getMine(_user: AuthenticatedUser) {
    return this.tenant.client.company.findFirstOrThrow();
  }

  async updateMine(_user: AuthenticatedUser, dto: UpdateCompanyDto) {
    const current = await this.tenant.client.company.findFirstOrThrow();
    return this.tenant.client.company.update({
      where: { id: current.id },
      data: dto,
    });
  }
}
