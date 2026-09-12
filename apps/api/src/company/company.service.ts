import { Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import { TenantPrismaFactory } from '../tenant/tenant-prisma.service';
import { saveCompanyImage } from '../uploads/storage';
import type { UpdateCompanyDto } from './dto/update-company.dto';

@Injectable()
export class CompanyService {
  constructor(private readonly tenants: TenantPrismaFactory) {}

  async getMine(user: AuthenticatedUser) {
    return this.tenants.forCompany(user.companyId).company.findFirstOrThrow();
  }

  async updateMine(user: AuthenticatedUser, dto: UpdateCompanyDto) {
    const client = this.tenants.forCompany(user.companyId);
    const current = await client.company.findFirstOrThrow();
    return client.company.update({
      where: { id: current.id },
      data: dto,
    });
  }

  async uploadLogo(user: AuthenticatedUser, file: Express.Multer.File) {
    const saved = saveCompanyImage(user.companyId, 'logo', file);
    const client = this.tenants.forCompany(user.companyId);
    const current = await client.company.findFirstOrThrow();
    return client.company.update({
      where: { id: current.id },
      data: { logoUrl: saved.url },
    });
  }
}
