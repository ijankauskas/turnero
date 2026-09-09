import { Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import { hiddenNotFound } from '../common/http';
import { TenantPrismaFactory } from '../tenant/tenant-prisma.service';
import type { CreateBranchDto, UpdateBranchDto } from './dto/branch.dto';

@Injectable()
export class BranchesService {
  constructor(private readonly tenants: TenantPrismaFactory) {}

  async list(user: AuthenticatedUser) {
    const db = this.tenants.forCompany(user.companyId);
    const where: Record<string, unknown> = { deletedAt: null };
    if (user.role === 'ENCARGADO' || user.role === 'RECEPCION') {
      where.id = user.branchId ?? '__none__';
    }
    if (user.role === 'PROFESIONAL' && user.professionalId) {
      const links = await db.professionalBranch.findMany({
        where: { professionalId: user.professionalId },
        select: { branchId: true },
      });
      where.id = { in: links.map((row) => row.branchId) };
    }
    return db.branch.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  async create(user: AuthenticatedUser, dto: CreateBranchDto) {
    return this.tenants.forCompany(user.companyId).branch.create({
      data: {
        companyId: user.companyId,
        name: dto.name,
        address: dto.address,
        phone: dto.phone,
      },
    });
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateBranchDto) {
    const db = this.tenants.forCompany(user.companyId);
    const existing = await db.branch.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) {
      hiddenNotFound();
    }
    return db.branch.update({
      where: { id },
      data: dto,
    });
  }
}
