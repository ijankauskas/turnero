import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/auth.types';
import { hiddenNotFound, money } from '../common/http';
import { paginated, parsePage } from '../common/pagination';
import { TenantPrismaFactory } from '../tenant/tenant-prisma.service';
import type { CreateServiceDto, UpdateServiceDto } from './dto/service.dto';

@Injectable()
export class ServicesService {
  constructor(private readonly tenants: TenantPrismaFactory) {}

  async list(user: AuthenticatedUser, query?: string, page?: string, pageSize?: string) {
    const db = this.tenants.forCompany(user.companyId);
    const paging = parsePage(page, pageSize);
    const where: Prisma.ServiceWhereInput = { deletedAt: null };
    const needle = (query ?? '').trim();
    if (needle) {
      where.name = { contains: needle, mode: 'insensitive' };
    }
    const [total, rows] = await Promise.all([
      db.service.count({ where }),
      db.service.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: paging.skip,
        take: paging.take,
      }),
    ]);
    return paginated(rows.map(serializeService), total, paging.page, paging.pageSize);
  }

  async create(user: AuthenticatedUser, dto: CreateServiceDto) {
    const row = await this.tenants.forCompany(user.companyId).service.create({
      data: {
        companyId: user.companyId,
        name: dto.name,
        durationMinutes: dto.durationMinutes,
        basePrice: dto.basePrice,
        openPrice: dto.openPrice ?? false,
      },
    });
    return serializeService(row);
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateServiceDto) {
    const db = this.tenants.forCompany(user.companyId);
    const existing = await db.service.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) {
      hiddenNotFound();
    }
    const row = await db.service.update({
      where: { id },
      data: {
        name: dto.name,
        durationMinutes: dto.durationMinutes,
        basePrice: dto.basePrice,
        active: dto.active,
        openPrice: dto.openPrice,
      },
    });
    return serializeService(row);
  }
}

function serializeService(row: {
  id: string;
  name: string;
  durationMinutes: number;
  basePrice: { toNumber?: () => number } | number;
  openPrice: boolean;
  active: boolean;
}) {
  return {
    id: row.id,
    name: row.name,
    durationMinutes: row.durationMinutes,
    basePrice: money(row.basePrice),
    openPrice: row.openPrice,
    active: row.active,
  };
}
