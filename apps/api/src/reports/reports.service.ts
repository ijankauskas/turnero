import { ForbiddenException, Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import {
  clockToMinutes,
  dateInZone,
  dateToClock,
  dayRangeUtc,
  weekdayIsoInZone,
} from '../common/clock';
import { money } from '../common/http';
import { scopedAppointmentQuery } from '../common/list-scope';
import { TenantPrismaFactory } from '../tenant/tenant-prisma.service';
import { occupancyPercent } from './occupancy';
import { parseReportRange } from './range';

@Injectable()
export class ReportsService {
  constructor(private readonly tenants: TenantPrismaFactory) {}

  async professionals(
    user: AuthenticatedUser,
    query: { from: string; to: string; branchId?: string },
  ) {
    const branchId = this.forcedBranch(user, query.branchId);
    const db = this.tenants.forCompany(user.companyId);
    const company = await db.company.findFirstOrThrow();
    const range = parseReportRange(query.from, query.to, company.timezone);
    const rows = await db.appointment.findMany({
      where: {
        status: 'ATENDIDO',
        startAt: { gte: range.start, lt: range.end },
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
      const pending = row.pricePending;
      const price = pending ? 0 : money(row.price);
      const commission = pending
        ? 0
        : row.remunerationTypeSnapshot === 'PERCENT'
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
    const priced = rows.filter((row) => !row.pricePending);
    const facturado = priced.reduce((sum, row) => sum + money(row.price), 0);
    const occupied = rows.reduce((sum, row) => sum + row.durationMinutes, 0);
    const weekday = weekdayIsoInZone(range.from, company.timezone);
    const blocks = await db.workSchedule.findMany({
      where: {
        weekday,
        isOff: false,
        ...(branchId ? { branchId } : {}),
      },
    });
    const scheduledMinutes = blocks.reduce((sum, block) => {
      return (
        sum +
        (clockToMinutes(dateToClock(block.endTime)) -
          clockToMinutes(dateToClock(block.startTime)))
      );
    }, 0);
    return {
      date: query.date,
      count: rows.length,
      facturado,
      averageTicket: priced.length ? facturado / priced.length : 0,
      occupiedMinutes: occupied,
      scheduledMinutes,
      occupancyPercent: occupancyPercent(occupied, scheduledMinutes),
    };
  }

  async live(
    user: AuthenticatedUser,
    query: { date: string; branchId?: string },
  ) {
    const branchId = this.forcedBranch(user, query.branchId);
    const db = this.tenants.forCompany(user.companyId);
    const company = await db.company.findFirstOrThrow();
    const today = dateInZone(new Date(), company.timezone);
    if (query.date !== today) {
      return { date: query.date, next: null, inProgress: [] };
    }
    const scoped = scopedAppointmentQuery(user, { branchId });
    const range = dayRangeUtc(query.date, company.timezone);
    const rows = await db.appointment.findMany({
      where: {
        status: { not: 'CANCELADO' },
        startAt: { gte: range.from, lt: range.to },
        ...(scoped.branchId ? { branchId: scoped.branchId } : {}),
        ...(scoped.professionalId
          ? { professionalId: scoped.professionalId }
          : {}),
      },
      include: {
        client: true,
        professional: { select: { id: true, displayName: true, color: true } },
      },
      orderBy: { startAt: 'asc' },
    });
    const now = new Date();
    const inProgress = rows
      .filter((row) => row.startAt <= now && row.endAt > now)
      .map(serializeLive);
    const nextRow = rows.find((row) => row.startAt > now);
    return {
      date: query.date,
      next: nextRow ? serializeLive(nextRow) : null,
      inProgress,
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

function serializeLive(row: {
  id: string;
  startAt: Date;
  endAt: Date;
  serviceNameSnapshot: string;
  professionalId: string;
  client: { firstName: string; lastName: string };
  professional: { id: string; displayName: string; color: string };
}) {
  return {
    id: row.id,
    startAt: row.startAt.toISOString(),
    endAt: row.endAt.toISOString(),
    serviceNameSnapshot: row.serviceNameSnapshot,
    professionalId: row.professionalId,
    client: row.client,
    professional: row.professional,
  };
}
