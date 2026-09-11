import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import { hiddenNotFound, money } from '../common/http';
import { TenantPrismaFactory } from '../tenant/tenant-prisma.service';
import type {
  CreateServicePackageDto,
  SellClientPackageDto,
  UpdateServicePackageDto,
} from './dto/package.dto';

@Injectable()
export class PackagesService {
  constructor(private readonly tenants: TenantPrismaFactory) {}

  async listCatalog(user: AuthenticatedUser, serviceId?: string) {
    const db = this.tenants.forCompany(user.companyId);
    const rows = await db.servicePackage.findMany({
      where: {
        deletedAt: null,
        ...(serviceId ? { serviceId } : {}),
      },
      include: { service: { select: { id: true, name: true } } },
      orderBy: [{ active: 'desc' }, { name: 'asc' }],
    });
    return rows.map(serializeServicePackage);
  }

  async createCatalog(user: AuthenticatedUser, dto: CreateServicePackageDto) {
    const db = this.tenants.forCompany(user.companyId);
    const service = await db.service.findFirst({
      where: { id: dto.serviceId, deletedAt: null },
    });
    if (!service) {
      hiddenNotFound();
    }
    const row = await db.servicePackage.create({
      data: {
        companyId: user.companyId,
        serviceId: dto.serviceId,
        name: dto.name.trim(),
        sessionCount: dto.sessionCount,
        price: dto.price,
        validityDays: dto.validityDays ?? null,
      },
      include: { service: { select: { id: true, name: true } } },
    });
    return serializeServicePackage(row);
  }

  async updateCatalog(
    user: AuthenticatedUser,
    id: string,
    dto: UpdateServicePackageDto,
  ) {
    const db = this.tenants.forCompany(user.companyId);
    const existing = await db.servicePackage.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) {
      hiddenNotFound();
    }
    const row = await db.servicePackage.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        sessionCount: dto.sessionCount,
        price: dto.price,
        validityDays:
          dto.validityDays === undefined ? undefined : dto.validityDays,
        active: dto.active,
      },
      include: { service: { select: { id: true, name: true } } },
    });
    return serializeServicePackage(row);
  }

  async listForClient(user: AuthenticatedUser, clientId: string) {
    const db = this.tenants.forCompany(user.companyId);
    const client = await db.client.findFirst({
      where: { id: clientId, deletedAt: null },
    });
    if (!client) {
      hiddenNotFound();
    }
    const rows = await db.clientPackage.findMany({
      where: { clientId },
      include: {
        service: { select: { id: true, name: true } },
        servicePackage: { select: { id: true, name: true } },
      },
      orderBy: [{ active: 'desc' }, { purchasedAt: 'desc' }],
    });
    return rows.map(serializeClientPackage);
  }

  async availableForClientService(
    user: AuthenticatedUser,
    clientId: string,
    serviceId: string,
  ) {
    const rows = await this.listForClient(user, clientId);
    const now = Date.now();
    return rows.filter(
      (row) =>
        row.serviceId === serviceId &&
        row.active &&
        row.remainingSessions > 0 &&
        (!row.expiresAt || new Date(row.expiresAt).getTime() >= now),
    );
  }

  async sellToClient(
    user: AuthenticatedUser,
    clientId: string,
    dto: SellClientPackageDto,
  ) {
    const db = this.tenants.forCompany(user.companyId);
    const client = await db.client.findFirst({
      where: { id: clientId, deletedAt: null, active: true },
    });
    if (!client) {
      hiddenNotFound();
    }
    const catalog = await db.servicePackage.findFirst({
      where: { id: dto.servicePackageId, deletedAt: null, active: true },
    });
    if (!catalog) {
      throw new BadRequestException('El pack no está disponible');
    }
    const expiresAt =
      catalog.validityDays != null
        ? new Date(Date.now() + catalog.validityDays * 86_400_000)
        : null;
    const row = await db.clientPackage.create({
      data: {
        companyId: user.companyId,
        clientId,
        servicePackageId: catalog.id,
        serviceId: catalog.serviceId,
        nameSnapshot: catalog.name,
        totalSessions: catalog.sessionCount,
        usedSessions: 0,
        pricePaid: catalog.price,
        expiresAt,
        notes: dto.notes,
      },
      include: {
        service: { select: { id: true, name: true } },
        servicePackage: { select: { id: true, name: true } },
      },
    });
    return serializeClientPackage(row);
  }

  async consumeForAppointment(input: {
    companyId: string;
    clientId: string;
    serviceId: string;
    clientPackageId: string;
  }) {
    const db = this.tenants.forCompany(input.companyId);
    const pack = await db.clientPackage.findFirst({
      where: {
        id: input.clientPackageId,
        clientId: input.clientId,
        active: true,
      },
    });
    if (!pack) {
      throw new BadRequestException('El pack del cliente no existe');
    }
    if (pack.serviceId !== input.serviceId) {
      throw new BadRequestException(
        'Ese pack no corresponde al servicio elegido',
      );
    }
    if (pack.usedSessions >= pack.totalSessions) {
      throw new ConflictException('El pack no tiene sesiones disponibles');
    }
    if (pack.expiresAt && pack.expiresAt.getTime() < Date.now()) {
      throw new ConflictException('El pack está vencido');
    }
    const sessionNumber = pack.usedSessions + 1;
    // Optimistic lock: usedSessions must still match (evita sobreconsumo concurrente).
    const claimed = await db.clientPackage.updateMany({
      where: {
        id: pack.id,
        clientId: input.clientId,
        active: true,
        usedSessions: pack.usedSessions,
        ...(pack.expiresAt
          ? { OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }] }
          : {}),
      },
      data: {
        usedSessions: sessionNumber,
        active: sessionNumber < pack.totalSessions,
      },
    });
    if (claimed.count !== 1) {
      throw new ConflictException('El pack no tiene sesiones disponibles');
    }
    return {
      clientPackageId: pack.id,
      sessionNumber,
      remainingSessions: pack.totalSessions - sessionNumber,
      nameSnapshot: pack.nameSnapshot,
    };
  }

  async restoreSession(companyId: string, clientPackageId: string) {
    const db = this.tenants.forCompany(companyId);
    const pack = await db.clientPackage.findFirst({
      where: { id: clientPackageId },
    });
    if (!pack || pack.usedSessions <= 0) {
      return;
    }
    await db.clientPackage.updateMany({
      where: {
        id: pack.id,
        usedSessions: pack.usedSessions,
      },
      data: {
        usedSessions: pack.usedSessions - 1,
        active: true,
      },
    });
  }
}

function serializeServicePackage(row: {
  id: string;
  serviceId: string;
  name: string;
  sessionCount: number;
  price: { toNumber?: () => number } | number;
  validityDays: number | null;
  active: boolean;
  service?: { id: string; name: string };
}) {
  return {
    id: row.id,
    serviceId: row.serviceId,
    name: row.name,
    sessionCount: row.sessionCount,
    price: money(row.price),
    validityDays: row.validityDays,
    active: row.active,
    service: row.service,
  };
}

function serializeClientPackage(row: {
  id: string;
  clientId?: string;
  serviceId: string;
  servicePackageId: string;
  nameSnapshot: string;
  totalSessions: number;
  usedSessions: number;
  pricePaid: { toNumber?: () => number } | number;
  purchasedAt: Date;
  expiresAt: Date | null;
  active: boolean;
  notes: string | null;
  service?: { id: string; name: string };
  servicePackage?: { id: string; name: string };
}) {
  return {
    id: row.id,
    clientId: row.clientId,
    serviceId: row.serviceId,
    servicePackageId: row.servicePackageId,
    name: row.nameSnapshot,
    totalSessions: row.totalSessions,
    usedSessions: row.usedSessions,
    remainingSessions: Math.max(0, row.totalSessions - row.usedSessions),
    pricePaid: money(row.pricePaid),
    purchasedAt: row.purchasedAt.toISOString(),
    expiresAt: row.expiresAt?.toISOString() ?? null,
    active: row.active,
    notes: row.notes,
    service: row.service,
    servicePackage: row.servicePackage,
  };
}
