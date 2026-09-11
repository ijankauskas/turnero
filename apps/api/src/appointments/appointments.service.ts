import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { AppointmentStatus } from '@turnero/shared';
import type { AuthenticatedUser } from '../auth/auth.types';
import { canTransition } from '../common/appointment-status';
import {
  dateToClock,
  dayRangeUtc,
  minutesOfDayInZone,
  weekdayIsoInZone,
  zonedLocalToUtc,
} from '../common/clock';
import { hiddenNotFound, money } from '../common/http';
import { canWriteAppointments, scopedAppointmentQuery } from '../common/list-scope';
import { digitsOnly } from '../common/phone';
import { fitsScheduleBlock } from '../common/schedule-rules';
import { TenantPrismaFactory } from '../tenant/tenant-prisma.service';
import { PackagesService } from '../packages/packages.service';
import type {
  CancelAppointmentDto,
  CreateAppointmentDto,
  UpdateAppointmentDto,
} from './dto/appointment.dto';

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly tenants: TenantPrismaFactory,
    private readonly packages: PackagesService,
  ) {}

  async list(
    user: AuthenticatedUser,
    query: {
      from?: string;
      to?: string;
      date?: string;
      branchId?: string;
      professionalId?: string;
      status?: AppointmentStatus;
    },
  ) {
    const db = this.tenants.forCompany(user.companyId);
    const company = await db.company.findFirstOrThrow();
    const scoped = scopedAppointmentQuery(user, query);
    const where: Record<string, unknown> = {};
    if (scoped.branchId) {
      where.branchId = scoped.branchId;
    }
    if (scoped.professionalId) {
      where.professionalId = scoped.professionalId;
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.date) {
      const range = dayRangeUtc(query.date, company.timezone);
      where.startAt = { gte: range.from, lt: range.to };
    } else if (query.from || query.to) {
      where.startAt = {
        ...(query.from ? { gte: new Date(query.from) } : {}),
        ...(query.to ? { lt: new Date(query.to) } : {}),
      };
    }
    const rows = await db.appointment.findMany({
      where,
      include: appointmentInclude,
      orderBy: { startAt: 'asc' },
    });
    return rows.map(serializeAppointment);
  }

  async get(user: AuthenticatedUser, id: string) {
    const row = await this.loadVisible(user, id);
    return serializeAppointment(row);
  }

  async create(user: AuthenticatedUser, dto: CreateAppointmentDto) {
    this.assertWriter(user);
    const payload = await this.buildSnapshot(user, {
      branchId: dto.branchId,
      professionalId: dto.professionalId,
      clientId: dto.clientId,
      serviceId: dto.serviceId,
      startAt: new Date(dto.startAt),
    });
    await this.assertNoOverlap(user, payload.professionalId, payload.startAt, payload.endAt);
    if (dto.paid && payload.pricePending && !dto.clientPackageId) {
      throw new ConflictException(
        'Definí el precio del servicio antes de marcarlo pagado',
      );
    }
    const db = this.tenants.forCompany(user.companyId);
    let packageMeta: {
      clientPackageId: string;
      sessionNumber: number;
      nameSnapshot: string;
    } | null = null;
    if (dto.clientPackageId) {
      const consumed = await this.packages.consumeForAppointment({
        companyId: user.companyId,
        clientId: dto.clientId,
        serviceId: dto.serviceId,
        clientPackageId: dto.clientPackageId,
      });
      packageMeta = consumed;
      payload.price = 0;
      payload.pricePending = false;
    }
    const created = await db.appointment.create({
      data: {
        companyId: user.companyId,
        ...payload,
        paid: packageMeta ? true : (dto.paid ?? false),
        observations: dto.observations,
        internalNotes: dto.internalNotes,
        createdByUserId: user.id,
        clientPackageId: packageMeta?.clientPackageId,
        sessionNumber: packageMeta?.sessionNumber,
      },
      include: appointmentInclude,
    });
    await this.enqueue(user, created.id, 'CREATED', created);
    return serializeAppointment(created);
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateAppointmentDto) {
    this.assertWriter(user);
    const current = await this.loadVisible(user, id);
    if (current.status === 'CANCELADO') {
      throw new ConflictException('Un turno cancelado no se reabre; creá uno nuevo');
    }
    const branchId = dto.branchId ?? current.branchId;
    const professionalId = dto.professionalId ?? current.professionalId;
    const clientId = dto.clientId ?? current.clientId;
    const serviceId = dto.serviceId ?? current.serviceId;
    const startAt = dto.startAt ? new Date(dto.startAt) : current.startAt;
    const material =
      dto.startAt ||
      dto.professionalId ||
      dto.serviceId ||
      dto.branchId;
    if (
      current.clientPackageId &&
      ((dto.serviceId && dto.serviceId !== current.serviceId) ||
        (dto.clientId && dto.clientId !== current.clientId))
    ) {
      throw new ConflictException(
        'Un turno con pack no cambia de servicio ni de cliente; cancelá y creá uno nuevo',
      );
    }
    const applyCatalog = Boolean(dto.professionalId || dto.serviceId);
    const keepPackBilling = Boolean(current.clientPackageId);
    const snapshot = await this.buildSnapshot(user, {
      branchId,
      professionalId,
      clientId,
      serviceId,
      startAt,
    });
    const durationMinutes = applyCatalog
      ? snapshot.durationMinutes
      : current.durationMinutes;
    const endAt = applyCatalog
      ? snapshot.endAt
      : new Date(startAt.getTime() + durationMinutes * 60_000);
    const price = keepPackBilling
      ? 0
      : applyCatalog
        ? snapshot.price
        : current.price;
    const pricePending = keepPackBilling
      ? false
      : applyCatalog
        ? snapshot.pricePending
        : current.pricePending;
    if ((dto.paid ?? current.paid) && pricePending) {
      throw new ConflictException(
        'Definí el precio del servicio antes de marcarlo pagado',
      );
    }
    await this.assertNoOverlap(
      user,
      snapshot.professionalId,
      snapshot.startAt,
      endAt,
      id,
    );
    const db = this.tenants.forCompany(user.companyId);
    const updated = await db.appointment.update({
      where: { id },
      data: {
        ...snapshot,
        durationMinutes,
        endAt,
        price,
        pricePending,
        ...(applyCatalog
          ? {}
          : {
              serviceNameSnapshot: current.serviceNameSnapshot,
              remunerationTypeSnapshot: current.remunerationTypeSnapshot,
              remunerationValueSnapshot: current.remunerationValueSnapshot,
            }),
        paid: dto.paid,
        observations: dto.observations,
        internalNotes: dto.internalNotes,
      },
      include: appointmentInclude,
    });
    if (material) {
      await this.enqueue(user, id, 'UPDATED', updated);
    }
    return serializeAppointment(updated);
  }

  async cancel(
    user: AuthenticatedUser,
    id: string,
    dto: CancelAppointmentDto,
  ) {
    this.assertWriter(user);
    const current = await this.loadVisible(user, id);
    if (current.status === 'CANCELADO') {
      throw new ConflictException('El turno ya está cancelado');
    }
    if (!canTransition(current.status, 'CANCELADO', user.role)) {
      throw new ConflictException('Transición de estado no permitida');
    }
    const db = this.tenants.forCompany(user.companyId);
    if (current.clientPackageId) {
      await this.packages.restoreSession(user.companyId, current.clientPackageId);
    }
    const updated = await db.appointment.update({
      where: { id },
      data: {
        status: 'CANCELADO',
        cancelledAt: new Date(),
        cancelledByUserId: user.id,
        cancelReason: dto.reason,
      },
      include: appointmentInclude,
    });
    await this.enqueue(user, id, 'CANCELLED', updated);
    return serializeAppointment(updated);
  }

  async setStatus(
    user: AuthenticatedUser,
    id: string,
    status: AppointmentStatus,
  ) {
    this.assertWriter(user);
    const current = await this.loadVisible(user, id);
    if (!canTransition(current.status, status, user.role)) {
      throw new ConflictException('Transición de estado no permitida');
    }
    if (status === 'CANCELADO') {
      return this.cancel(user, id, {});
    }
    const updated = await this.tenants.forCompany(user.companyId).appointment.update({
      where: { id },
      data: { status },
      include: appointmentInclude,
    });
    return serializeAppointment(updated);
  }

  async setPaid(user: AuthenticatedUser, id: string, paid: boolean) {
    this.assertWriter(user);
    const current = await this.loadVisible(user, id);
    if (paid && current.pricePending) {
      throw new ConflictException(
        'Definí el precio del servicio antes de marcarlo pagado',
      );
    }
    const db = this.tenants.forCompany(user.companyId);
    if (paid && !current.paid) {
      await db.payment.create({
        data: {
          companyId: user.companyId,
          appointmentId: id,
          amount: current.price,
          paidAt: new Date(),
          createdByUserId: user.id,
        },
      });
    }
    const updated = await db.appointment.update({
      where: { id },
      data: { paid },
      include: appointmentInclude,
    });
    return serializeAppointment(updated);
  }

  async setPrice(user: AuthenticatedUser, id: string, price: number) {
    this.assertWriter(user);
    const current = await this.loadVisible(user, id);
    if (current.status === 'CANCELADO') {
      throw new ConflictException(
        'No se puede cargar precio en un turno cancelado',
      );
    }
    if (current.paid) {
      throw new ConflictException('Desmarcá pagado para cambiar el precio');
    }
    const updated = await this.tenants
      .forCompany(user.companyId)
      .appointment.update({
        where: { id },
        data: { price, pricePending: false },
        include: appointmentInclude,
      });
    return serializeAppointment(updated);
  }

  async availability(
    user: AuthenticatedUser,
    query: {
      professionalId: string;
      branchId: string;
      date: string;
      serviceId: string;
    },
  ) {
    if (user.role === 'PROFESIONAL' && user.professionalId !== query.professionalId) {
      hiddenNotFound();
    }
    if (
      (user.role === 'ENCARGADO' || user.role === 'RECEPCION') &&
      user.branchId !== query.branchId
    ) {
      throw new ForbiddenException('No tenés acceso a esta sucursal');
    }
    const db = this.tenants.forCompany(user.companyId);
    const company = await db.company.findFirstOrThrow();
    const offer = await db.professionalService.findFirst({
      where: {
        professionalId: query.professionalId,
        serviceId: query.serviceId,
        active: true,
      },
      include: { service: true },
    });
    if (!offer || !offer.service.active) {
      throw new BadRequestException('Ese profesional no ofrece el servicio');
    }
    const duration = offer.service.durationMinutes;
    const weekday = weekdayIsoInZone(
      dayRangeUtc(query.date, company.timezone).from,
      company.timezone,
    );
    const blocks = await db.workSchedule.findMany({
      where: {
        professionalId: query.professionalId,
        branchId: query.branchId,
        weekday,
        isOff: false,
      },
    });
    const range = dayRangeUtc(query.date, company.timezone);
    const busy = await db.appointment.findMany({
      where: {
        professionalId: query.professionalId,
        status: { not: 'CANCELADO' },
        startAt: { lt: range.to },
        endAt: { gt: range.from },
      },
    });
    const slots: Array<{ startAt: string; endAt: string }> = [];
    for (const block of blocks) {
      const startMin = minutesFromClock(dateToClock(block.startTime));
      const endMin = minutesFromClock(dateToClock(block.endTime));
      for (let minute = startMin; minute + duration <= endMin; minute += 15) {
        const startAt = minutesToZoned(
          query.date,
          minute,
          company.timezone,
        );
        const endAt = new Date(startAt.getTime() + duration * 60_000);
        const overlaps = busy.some(
          (row) => row.startAt < endAt && row.endAt > startAt,
        );
        if (!overlaps) {
          slots.push({
            startAt: startAt.toISOString(),
            endAt: endAt.toISOString(),
          });
        }
      }
    }
    return { durationMinutes: duration, slots };
  }

  async whatsappLink(user: AuthenticatedUser, id: string) {
    const row = await this.loadVisible(user, id);
    const company = await this.tenants
      .forCompany(user.companyId)
      .company.findFirstOrThrow();
    const digits = digitsOnly(row.client.phone);
    const fecha = new Intl.DateTimeFormat('es-AR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      timeZone: company.timezone,
    }).format(row.startAt);
    const hora = new Intl.DateTimeFormat('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: company.timezone,
    }).format(row.startAt);
    const text = [
      `Hola ${row.client.firstName},`,
      '',
      `Te contactamos de ${company.name}.`,
      '',
      'Recordatorio de tu turno:',
      '',
      `📅 ${fecha}`,
      `🕐 ${hora} hs`,
      `💅 ${row.serviceNameSnapshot}`,
      `👩 Profesional: ${row.professional.displayName}`,
      `📍 Sucursal ${row.branch.name}`,
      '',
      '¡Te esperamos!',
    ].join('\n');
    return {
      url: `https://wa.me/${digits}?text=${encodeURIComponent(text)}`,
    };
  }

  private assertWriter(user: AuthenticatedUser) {
    if (!canWriteAppointments(user)) {
      throw new ForbiddenException('El profesional no carga turnos');
    }
  }

  private async loadVisible(user: AuthenticatedUser, id: string) {
    const db = this.tenants.forCompany(user.companyId);
    const row = await db.appointment.findFirst({
      where: { id },
      include: appointmentInclude,
    });
    if (!row) {
      hiddenNotFound();
    }
    if (user.role === 'PROFESIONAL' && row.professionalId !== user.professionalId) {
      hiddenNotFound();
    }
    if (
      (user.role === 'ENCARGADO' || user.role === 'RECEPCION') &&
      row.branchId !== user.branchId
    ) {
      hiddenNotFound();
    }
    return row;
  }

  private async buildSnapshot(
    user: AuthenticatedUser,
    input: {
      branchId: string;
      professionalId: string;
      clientId: string;
      serviceId: string;
      startAt: Date;
    },
  ) {
    if (
      (user.role === 'ENCARGADO' || user.role === 'RECEPCION') &&
      input.branchId !== user.branchId
    ) {
      throw new ForbiddenException('No tenés acceso a esta sucursal');
    }
    const db = this.tenants.forCompany(user.companyId);
    const company = await db.company.findFirstOrThrow();
    const branch = await db.branch.findFirst({
      where: { id: input.branchId, deletedAt: null, active: true },
    });
    const professional = await db.professional.findFirst({
      where: { id: input.professionalId, deletedAt: null, active: true },
    });
    const client = await db.client.findFirst({
      where: { id: input.clientId, deletedAt: null, active: true },
    });
    const link = await db.professionalBranch.findFirst({
      where: {
        professionalId: input.professionalId,
        branchId: input.branchId,
      },
    });
    const offer = await db.professionalService.findFirst({
      where: {
        professionalId: input.professionalId,
        serviceId: input.serviceId,
        active: true,
      },
      include: { service: true },
    });
    if (!branch || !professional || !client || !link || !offer || !offer.service.active) {
      throw new BadRequestException(
        'Sucursal, profesional, cliente o servicio inválidos para este turno',
      );
    }
    const duration = offer.service.durationMinutes;
    const endAt = new Date(input.startAt.getTime() + duration * 60_000);
    const weekday = weekdayIsoInZone(input.startAt, company.timezone);
    const startMin = minutesOfDayInZone(input.startAt, company.timezone);
    const endMin = minutesOfDayInZone(endAt, company.timezone);
    const blocks = await db.workSchedule.findMany({
      where: { professionalId: input.professionalId },
    });
    if (
      !fitsScheduleBlock(weekday, input.branchId, startMin, endMin, blocks)
    ) {
      throw new ConflictException(
        'El turno está fuera del horario del profesional en esa sucursal',
      );
    }
    return {
      branchId: input.branchId,
      professionalId: input.professionalId,
      clientId: input.clientId,
      serviceId: input.serviceId,
      startAt: input.startAt,
      endAt,
      durationMinutes: duration,
      price: offer.service.openPrice ? 0 : money(offer.price),
      pricePending: offer.service.openPrice,
      serviceNameSnapshot: offer.service.name,
      remunerationTypeSnapshot: offer.remunerationType,
      remunerationValueSnapshot: money(offer.remunerationValue),
    };
  }

  private async assertNoOverlap(
    user: AuthenticatedUser,
    professionalId: string,
    startAt: Date,
    endAt: Date,
    excludeId?: string,
  ) {
    const db = this.tenants.forCompany(user.companyId);
    const clash = await db.appointment.findFirst({
      where: {
        professionalId,
        status: { not: 'CANCELADO' },
        startAt: { lt: endAt },
        endAt: { gt: startAt },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
    if (clash) {
      throw new ConflictException('Ese horario ya tiene un turno');
    }
  }

  private async enqueue(
    user: AuthenticatedUser,
    appointmentId: string,
    type: 'CREATED' | 'UPDATED' | 'CANCELLED',
    appointment: { client: { email: string | null } },
  ) {
    if (!appointment.client.email) {
      return;
    }
    await this.tenants.forCompany(user.companyId).notificationJob.create({
        data: {
          companyId: user.companyId,
          appointmentId,
          channel: 'EMAIL',
          type,
          status: 'PENDING',
          payload: {
            to: appointment.client.email,
            type,
          },
        },
    });
  }
}

const appointmentInclude = {
  client: true,
  professional: { select: { id: true, displayName: true, color: true } },
  branch: { select: { id: true, name: true } },
  service: { select: { id: true, name: true } },
} as const;

function serializeAppointment(row: {
  id: string;
  branchId: string;
  professionalId: string;
  clientId: string;
  serviceId: string;
  clientPackageId?: string | null;
  sessionNumber?: number | null;
  startAt: Date;
  endAt: Date;
  durationMinutes: number;
  price: { toNumber?: () => number } | number;
  pricePending: boolean;
  serviceNameSnapshot: string;
  status: AppointmentStatus;
  paid: boolean;
  observations: string | null;
  internalNotes: string | null;
  cancelledAt: Date | null;
  cancelReason: string | null;
  client: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    email: string | null;
  };
  professional: { id: string; displayName: string; color: string };
  branch: { id: string; name: string };
}) {
  return {
    id: row.id,
    branchId: row.branchId,
    professionalId: row.professionalId,
    clientId: row.clientId,
    serviceId: row.serviceId,
    clientPackageId: row.clientPackageId ?? null,
    sessionNumber: row.sessionNumber ?? null,
    startAt: row.startAt.toISOString(),
    endAt: row.endAt.toISOString(),
    durationMinutes: row.durationMinutes,
    price: money(row.price),
    pricePending: row.pricePending,
    serviceNameSnapshot: row.serviceNameSnapshot,
    status: row.status,
    paid: row.paid,
    observations: row.observations,
    internalNotes: row.internalNotes,
    cancelledAt: row.cancelledAt?.toISOString() ?? null,
    cancelReason: row.cancelReason,
    client: row.client,
    professional: row.professional,
    branch: row.branch,
  };
}

function minutesFromClock(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function minutesToZoned(isoDate: string, minutes: number, timeZone: string): Date {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const hhmm = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  return zonedLocalToUtc(isoDate, hhmm, timeZone);
}
