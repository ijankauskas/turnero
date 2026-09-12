import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { UserRole } from '@turnero/shared';
import type { AuthenticatedUser } from '../auth/auth.types';
import { PasswordService } from '../auth/password.service';
import { hiddenNotFound } from '../common/http';
import { paginated, parsePage } from '../common/pagination';
import { TenantPrismaFactory } from '../tenant/tenant-prisma.service';
import type { CreateUserDto, UpdateUserDto } from './dto/user.dto';

const USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  role: true,
  branchId: true,
  professionalId: true,
  active: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(
    private readonly tenants: TenantPrismaFactory,
    private readonly passwords: PasswordService,
  ) {}

  async list(
    user: AuthenticatedUser,
    query?: string,
    page?: string,
    pageSize?: string,
  ) {
    const db = this.tenants.forCompany(user.companyId);
    const paging = parsePage(page, pageSize);
    const where: Prisma.UserWhereInput = { deletedAt: null };
    const needle = (query ?? '').trim();
    if (needle) {
      where.OR = [
        { firstName: { contains: needle, mode: 'insensitive' } },
        { lastName: { contains: needle, mode: 'insensitive' } },
        { email: { contains: needle, mode: 'insensitive' } },
      ];
    }
    const [total, rows] = await Promise.all([
      db.user.count({ where }),
      db.user.findMany({
        where,
        select: USER_SELECT,
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        skip: paging.skip,
        take: paging.take,
      }),
    ]);
    return paginated(rows, total, paging.page, paging.pageSize);
  }

  async create(actor: AuthenticatedUser, dto: CreateUserDto) {
    this.assertRoleBranch(dto.role, dto.branchId);
    const db = this.tenants.forCompany(actor.companyId);
    if (dto.branchId) {
      const branch = await db.branch.findFirst({
        where: { id: dto.branchId, deletedAt: null },
      });
      if (!branch) {
        hiddenNotFound();
      }
    }
    const passwordHash = await this.passwords.hash(dto.password);
    try {
      const created = await db.user.create({
        data: {
          companyId: actor.companyId,
          email: dto.email.trim().toLowerCase(),
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone,
          role: dto.role,
          branchId: dto.branchId ?? null,
        },
        select: USER_SELECT,
      });
      if (dto.role !== 'PROFESIONAL') {
        return created;
      }
      const professional = await db.professional.create({
        data: {
          companyId: actor.companyId,
          userId: created.id,
          displayName: dto.displayName ?? dto.firstName,
          title: dto.title,
          color: dto.color ?? '#7C6FF7',
        },
      });
      if (dto.branchId) {
        await db.professionalBranch.create({
          data: {
            companyId: actor.companyId,
            professionalId: professional.id,
            branchId: dto.branchId,
            isPrimary: true,
          },
        });
      }
      return db.user.update({
        where: { id: created.id },
        data: { professionalId: professional.id },
        select: USER_SELECT,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Ese email ya existe en la empresa');
      }
      throw error;
    }
  }

  async update(actor: AuthenticatedUser, id: string, dto: UpdateUserDto) {
    const db = this.tenants.forCompany(actor.companyId);
    const existing = await db.user.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) {
      hiddenNotFound();
    }
    const role = dto.role ?? existing.role;
    const branchId =
      dto.branchId === undefined ? existing.branchId : dto.branchId;
    this.assertRoleBranch(role, branchId);
    const data: Record<string, unknown> = {
      email: dto.email?.trim().toLowerCase(),
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
      role: dto.role,
      active: dto.active,
    };
    if (dto.branchId !== undefined) {
      data.branchId = dto.branchId;
    }
    if (dto.password) {
      data.passwordHash = await this.passwords.hash(dto.password);
    }
    try {
      return await db.user.update({
        where: { id },
        data,
        select: USER_SELECT,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Ese email ya existe en la empresa');
      }
      throw error;
    }
  }

  async deactivate(actor: AuthenticatedUser, id: string) {
    const db = this.tenants.forCompany(actor.companyId);
    const existing = await db.user.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) {
      hiddenNotFound();
    }
    await db.refreshToken.updateMany({
      where: { userId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return db.user.update({
      where: { id },
      data: { active: false },
      select: USER_SELECT,
    });
  }

  private assertRoleBranch(role: UserRole, branchId?: string | null) {
    if (
      (role === 'ENCARGADO' || role === 'RECEPCION') &&
      !branchId
    ) {
      throw new BadRequestException(
        'Encargado y Recepción requieren una sucursal',
      );
    }
    if (role === 'ADMINISTRADOR' && branchId) {
      throw new BadRequestException(
        'El administrador no se ata a una sucursal',
      );
    }
  }
}
