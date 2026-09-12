import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/auth.types';
import { hiddenNotFound } from '../common/http';
import { paginated, parsePage } from '../common/pagination';
import { TenantPrismaFactory } from '../tenant/tenant-prisma.service';
import type { CreateBranchDto, UpdateBranchDto } from './dto/branch.dto';

@Injectable()
export class BranchesService {
  constructor(private readonly tenants: TenantPrismaFactory) {}

  async list(
    user: AuthenticatedUser,
    query?: string,
    page?: string,
    pageSize?: string,
  ) {
    const db = this.tenants.forCompany(user.companyId);
    const paging = parsePage(page, pageSize);
    const where: Prisma.BranchWhereInput = { deletedAt: null };
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
    const needle = (query ?? '').trim();
    if (needle) {
      where.name = { contains: needle, mode: 'insensitive' };
    }
    const [total, rows] = await Promise.all([
      db.branch.count({ where }),
      db.branch.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: paging.skip,
        take: paging.take,
      }),
    ]);
    return paginated(rows, total, paging.page, paging.pageSize);
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
