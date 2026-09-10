import { Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import { hiddenNotFound, money } from '../common/http';
import { TenantPrismaFactory } from '../tenant/tenant-prisma.service';
import type { CreateServiceDto, UpdateServiceDto } from './dto/service.dto';

@Injectable()
export class ServicesService {
  constructor(private readonly tenants: TenantPrismaFactory) {}

  async list(user: AuthenticatedUser) {
    const rows = await this.tenants.forCompany(user.companyId).service.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' },
    });
    return rows.map(serializeService);
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
