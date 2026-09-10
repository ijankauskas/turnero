import { ConflictException, Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/auth.types';
import { hiddenNotFound } from '../common/http';
import { paginated, parsePage } from '../common/pagination';
import { digitsOnly, phonesMatch } from '../common/phone';
import { TenantPrismaFactory } from '../tenant/tenant-prisma.service';
import type { CreateClientDto, UpdateClientDto } from './dto/client.dto';

@Injectable()
export class ClientsService {
  constructor(private readonly tenants: TenantPrismaFactory) {}

  async list(
    user: AuthenticatedUser,
    query?: string,
    page?: string,
    pageSize?: string,
  ) {
    const db = this.tenants.forCompany(user.companyId);
    const paging = parsePage(page, pageSize);
    const where = this.listWhere(user, query);
    const [total, rows] = await Promise.all([
      db.client.count({ where }),
      db.client.findMany({
        where,
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        skip: paging.skip,
        take: paging.take,
      }),
    ]);
    return paginated(rows, total, paging.page, paging.pageSize);
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
      const mine = row.appointments.filter(
        (item) => item.professionalId === user.professionalId,
      );
      if (!mine.length) {
        hiddenNotFound();
      }
      return { ...row, appointments: mine };
    }
    return row;
  }

  async create(user: AuthenticatedUser, dto: CreateClientDto) {
    const db = this.tenants.forCompany(user.companyId);
    const digits = digitsOnly(dto.phone);
    const suffix = digits.slice(-8) || digits;
    const candidates = suffix
      ? await db.client.findMany({
          where: { deletedAt: null, phone: { contains: suffix } },
          take: 25,
        })
      : [];
    const matches = candidates.filter((row) =>
      phonesMatch(row.phone, dto.phone),
    );
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

  private listWhere(
    user: AuthenticatedUser,
    query?: string,
  ): Prisma.ClientWhereInput {
    const where: Prisma.ClientWhereInput = { deletedAt: null };
    if (user.role === 'PROFESIONAL' && user.professionalId) {
      where.appointments = {
        some: { professionalId: user.professionalId },
      };
    }
    const needle = (query ?? '').trim();
    if (!needle) {
      return where;
    }
    const tokens = needle.toLowerCase().split(/\s+/).filter(Boolean);
    where.AND = tokens.map((token) => {
      const digits = digitsOnly(token);
      const or: Prisma.ClientWhereInput[] = [
        { firstName: { contains: token, mode: 'insensitive' } },
        { lastName: { contains: token, mode: 'insensitive' } },
        { email: { contains: token, mode: 'insensitive' } },
      ];
      if (digits) {
        or.push({ phone: { contains: digits } });
      }
      return { OR: or };
    });
    return where;
  }
}
