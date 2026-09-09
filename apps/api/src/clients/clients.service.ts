import { ConflictException, Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import { hiddenNotFound } from '../common/http';
import { digitsOnly, phonesMatch } from '../common/phone';
import { TenantPrismaFactory } from '../tenant/tenant-prisma.service';
import type { CreateClientDto, UpdateClientDto } from './dto/client.dto';

@Injectable()
export class ClientsService {
  constructor(private readonly tenants: TenantPrismaFactory) {}

  async list(user: AuthenticatedUser, query?: string) {
    const db = this.tenants.forCompany(user.companyId);
    const where: Record<string, unknown> = { deletedAt: null };
    if (user.role === 'PROFESIONAL' && user.professionalId) {
      where.appointments = {
        some: { professionalId: user.professionalId },
      };
    }
    const rows = await db.client.findMany({
      where,
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });
    const needle = (query ?? '').trim().toLowerCase();
    if (!needle) {
      return rows;
    }
    const digits = digitsOnly(needle);
    return rows.filter((row) => {
      const name = `${row.firstName} ${row.lastName}`.toLowerCase();
      return (
        name.includes(needle) ||
        (digits.length > 0 && digitsOnly(row.phone).includes(digits))
      );
    });
  }

  async get(user: AuthenticatedUser, id: string) {
    const db = this.tenants.forCompany(user.companyId);
    const row = await db.client.findFirst({
      where: { id, deletedAt: null },
      include: {
        appointments: {
          orderBy: { startAt: 'desc' },
          take: 50,
          include: {
            professional: { select: { displayName: true } },
            service: { select: { name: true } },
          },
        },
      },
    });
    if (!row) {
      hiddenNotFound();
    }
    if (user.role === 'PROFESIONAL') {
      const allowed = row.appointments.some(
        (item) => item.professionalId === user.professionalId,
      );
      if (!allowed) {
        hiddenNotFound();
      }
    }
    return row;
  }

  async create(user: AuthenticatedUser, dto: CreateClientDto) {
    const db = this.tenants.forCompany(user.companyId);
    const existing = await db.client.findMany({
      where: { deletedAt: null },
    });
    const matches = existing.filter((row) => phonesMatch(row.phone, dto.phone));
    if (matches.length > 0 && !dto.forceCreate) {
      throw new ConflictException({
        error: 'DUPLICATE_PHONE',
        message: 'Ya hay un cliente con ese teléfono',
        matches: matches.map((row) => ({
          id: row.id,
          firstName: row.firstName,
          lastName: row.lastName,
          phone: row.phone,
        })),
      });
    }
    return db.client.create({
      data: {
        companyId: user.companyId,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        email: dto.email,
        notes: dto.notes,
        duplicateConfirmed: Boolean(dto.forceCreate && matches.length > 0),
      },
    });
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateClientDto) {
    await this.get(user, id);
    if (user.role === 'PROFESIONAL') {
      hiddenNotFound();
    }
    return this.tenants.forCompany(user.companyId).client.update({
      where: { id },
      data: dto,
    });
  }
}
