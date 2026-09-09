import { ForbiddenException, Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import { dayRangeUtc } from '../common/clock';
import { money } from '../common/http';
import { TenantPrismaFactory } from '../tenant/tenant-prisma.service';

@Injectable()
export class ReportsService {
  constructor(private readonly tenants: TenantPrismaFactory) {}

  async professionals(
    user: AuthenticatedUser,
    query: { from: string; to: string; branchId?: string },
  ) {
    const branchId = this.forcedBranch(user, query.branchId);
    const db = this.tenants.forCompany(user.companyId);
    const rows = await db.appointment.findMany({
      where: {
        status: 'ATENDIDO',
        startAt: { gte: new Date(query.from), lt: new Date(query.to) },
        ...(branchId ? { branchId } : {}),
      },
      include: { professional: true },
    });
    const byPro = new Map<
      string,
      { name: string; turnos: number; facturado: number; aPagar: number }
    >();
    for (const row of rows) {
      const current = byPro.get(row.professionalId) ?? {
        name: row.professional.displayName,
        turnos: 0,
        facturado: 0,
        aPagar: 0,
      };
      const price = money(row.price);
      const commission =
        row.remunerationTypeSnapshot === 'PERCENT'
          ? price * (money(row.remunerationValueSnapshot) / 100)
          : money(row.remunerationValueSnapshot);
      current.turnos += 1;
      current.facturado += price;
      current.aPagar += commission;
      byPro.set(row.professionalId, current);
    }
    return {
      items: [...byPro.entries()].map(([professionalId, item]) => ({
        professionalId,
        ...item,
      })),
    };
  }

  async daily(
    user: AuthenticatedUser,
    query: { date: string; branchId?: string },
  ) {
    const branchId = this.forcedBranch(user, query.branchId);
    const db = this.tenants.forCompany(user.companyId);
    const company = await db.company.findFirstOrThrow();
    const range = dayRangeUtc(query.date, company.timezone);
    const rows = await db.appointment.findMany({
      where: {
        status: { not: 'CANCELADO' },
        startAt: { gte: range.from, lt: range.to },
        ...(branchId ? { branchId } : {}),
      },
    });
    const facturado = rows.reduce((sum, row) => sum + money(row.price), 0);
    const occupied = rows.reduce((sum, row) => sum + row.durationMinutes, 0);
    return {
      date: query.date,
      count: rows.length,
      facturado,
      averageTicket: rows.length ? facturado / rows.length : 0,
      occupiedMinutes: occupied,
    };
  }

  private forcedBranch(user: AuthenticatedUser, branchId?: string) {
    if (user.role === 'ENCARGADO' || user.role === 'RECEPCION') {
      if (branchId && branchId !== user.branchId) {
        throw new ForbiddenException('No tenés acceso a esta sucursal');
      }
      return user.branchId ?? undefined;
    }
    return branchId;
  }
}
