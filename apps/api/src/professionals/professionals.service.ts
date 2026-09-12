import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import { clockToDate, dateToClock } from '../common/clock';
import { hiddenNotFound, money } from '../common/http';
import { assertScheduleNoCrossBranchOverlap } from '../common/schedule-rules';
import { TenantPrismaFactory } from '../tenant/tenant-prisma.service';
import type {
  CreateProfessionalDto,
  PutBranchesDto,
  PutProfessionalServicesDto,
  PutScheduleDto,
  UpdateProfessionalDto,
} from './dto/professional.dto';

@Injectable()
export class ProfessionalsService {
  constructor(private readonly tenants: TenantPrismaFactory) {}

  async list(user: AuthenticatedUser) {
    const db = this.tenants.forCompany(user.companyId);
    const where: Record<string, unknown> = { deletedAt: null };
    if (user.role === 'PROFESIONAL') {
      where.id = user.professionalId ?? '__none__';
    } else if (
      (user.role === 'ENCARGADO' || user.role === 'RECEPCION') &&
      user.branchId
    ) {
      where.branches = { some: { branchId: user.branchId } };
    }
    const rows = await db.professional.findMany({
      where,
      include: {
        branches: { include: { branch: true } },
        user: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
      orderBy: { displayName: 'asc' },
    });
    return rows.map(serializeProfessional);
  }

  async get(user: AuthenticatedUser, id: string) {
    const db = this.tenants.forCompany(user.companyId);
    if (user.role === 'PROFESIONAL' && user.professionalId !== id) {
      hiddenNotFound();
    }
    const row = await db.professional.findFirst({
      where: { id, deletedAt: null },
      include: {
        branches: { include: { branch: true } },
        user: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });
    if (!row) {
      hiddenNotFound();
    }
    return serializeProfessional(row);
  }

  async create(user: AuthenticatedUser, dto: CreateProfessionalDto) {
    const db = this.tenants.forCompany(user.companyId);
    const account = await db.user.findFirst({
      where: { id: dto.userId, deletedAt: null },
    });
    if (!account) {
      hiddenNotFound();
    }
    if (account.role !== 'PROFESIONAL') {
      throw new BadRequestException('El usuario debe tener rol PROFESIONAL');
    }
    const existing = await db.professional.findFirst({
      where: { userId: dto.userId },
    });
    if (existing) {
      throw new ConflictException('Ese usuario ya tiene ficha de profesional');
    }
    const professional = await db.professional.create({
      data: {
        companyId: user.companyId,
        userId: dto.userId,
        displayName: dto.displayName,
        title: dto.title,
        color: dto.color ?? '#7C6FF7',
      },
    });
    await db.user.update({
      where: { id: dto.userId },
      data: { professionalId: professional.id },
    });
    if (dto.branchIds?.length) {
      await this.replaceBranches(user, professional.id, {
        branchIds: dto.branchIds,
      });
    }
    return this.get(user, professional.id);
  }

  async update(
    user: AuthenticatedUser,
    id: string,
    dto: UpdateProfessionalDto,
  ) {
    const db = this.tenants.forCompany(user.companyId);
    const existing = await db.professional.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) {
      hiddenNotFound();
    }
    await db.professional.update({ where: { id }, data: dto });
    if (dto.active === false) {
      await db.user.update({
        where: { id: existing.userId },
        data: { active: false },
      });
    }
    return this.get(user, id);
  }

  async replaceBranches(
    user: AuthenticatedUser,
    id: string,
    dto: PutBranchesDto,
  ) {
    const db = this.tenants.forCompany(user.companyId);
    const professional = await db.professional.findFirst({
      where: { id, deletedAt: null },
    });
    if (!professional) {
      hiddenNotFound();
    }
    await db.professionalBranch.deleteMany({ where: { professionalId: id } });
    for (const [index, branchId] of dto.branchIds.entries()) {
      const branch = await db.branch.findFirst({
        where: { id: branchId, deletedAt: null },
      });
      if (!branch) {
        hiddenNotFound();
      }
      await db.professionalBranch.create({
        data: {
          companyId: user.companyId,
          professionalId: id,
          branchId,
          isPrimary:
            dto.primaryBranchId === branchId ||
            (!dto.primaryBranchId && index === 0),
        },
      });
    }
    return this.get(user, id);
  }

  async getSchedule(user: AuthenticatedUser, id: string) {
    await this.get(user, id);
    const db = this.tenants.forCompany(user.companyId);
    const rows = await db.workSchedule.findMany({
      where: { professionalId: id },
      orderBy: [{ weekday: 'asc' }, { startTime: 'asc' }],
    });
    if (
      (user.role === 'ENCARGADO' || user.role === 'RECEPCION') &&
      user.branchId
    ) {
      return rows
        .filter((row) => row.branchId === user.branchId)
        .map(serializeSchedule);
    }
    return rows.map(serializeSchedule);
  }

  async replaceSchedule(
    user: AuthenticatedUser,
    id: string,
    dto: PutScheduleDto,
  ) {
    await this.get(user, id);
    const check = assertScheduleNoCrossBranchOverlap(
      dto.blocks.map((block) => ({
        weekday: block.weekday,
        branchId: block.branchId,
        startTime: block.startTime,
        endTime: block.endTime,
        isOff: block.isOff ?? false,
      })),
    );
    if (!check.ok) {
      throw new ConflictException(check.message);
    }
    const db = this.tenants.forCompany(user.companyId);
    await db.workSchedule.deleteMany({ where: { professionalId: id } });
    for (const block of dto.blocks) {
      const branch = await db.branch.findFirst({
        where: { id: block.branchId, deletedAt: null },
      });
      if (!branch) {
        hiddenNotFound();
      }
      await db.workSchedule.create({
        data: {
          companyId: user.companyId,
          professionalId: id,
          branchId: block.branchId,
          weekday: block.weekday,
          startTime: clockToDate(block.startTime),
          endTime: clockToDate(block.endTime),
          isOff: block.isOff ?? false,
        },
      });
    }
    return this.getSchedule(user, id);
  }

  async getServicesMatrix(user: AuthenticatedUser, id: string) {
    await this.get(user, id);
    const db = this.tenants.forCompany(user.companyId);
    const rows = await db.professionalService.findMany({
      where: { professionalId: id },
      include: { service: true },
      orderBy: { service: { name: 'asc' } },
    });
    return rows.map((row) => ({
      id: row.id,
      serviceId: row.serviceId,
      serviceName: row.service.name,
      durationMinutes: row.service.durationMinutes,
      price: money(row.price),
      openPrice: row.service.openPrice,
      remunerationType: row.remunerationType,
      remunerationValue: money(row.remunerationValue),
      active: row.active,
    }));
  }

  async replaceServices(
    user: AuthenticatedUser,
    id: string,
    dto: PutProfessionalServicesDto,
  ) {
    await this.get(user, id);
    const db = this.tenants.forCompany(user.companyId);
    await db.professionalService.deleteMany({ where: { professionalId: id } });
    for (const item of dto.items) {
      if (item.remunerationType === 'PERCENT') {
        if (item.remunerationValue < 0 || item.remunerationValue > 100) {
          throw new BadRequestException('La comisión porcentual va de 0 a 100');
        }
      } else if (item.remunerationValue < 0) {
        throw new BadRequestException('La comisión fija no puede ser negativa');
      }
      const service = await db.service.findFirst({
        where: { id: item.serviceId, deletedAt: null },
      });
      if (!service) {
        hiddenNotFound();
      }
      await db.professionalService.create({
        data: {
          companyId: user.companyId,
          professionalId: id,
          serviceId: item.serviceId,
          price: item.price ?? money(service.basePrice),
          remunerationType: item.remunerationType,
          remunerationValue: item.remunerationValue,
          active: item.active ?? true,
        },
      });
    }
    return this.getServicesMatrix(user, id);
  }
}

function serializeProfessional(row: {
  id: string;
  displayName: string;
  title: string | null;
  color: string;
  active: boolean;
  userId: string;
  user: { id: string; email: string; firstName: string; lastName: string };
  branches: Array<{
    branchId: string;
    isPrimary: boolean;
    branch: { id: string; name: string };
  }>;
}) {
  return {
    id: row.id,
    displayName: row.displayName,
    title: row.title,
    color: row.color,
    active: row.active,
    userId: row.userId,
    user: row.user,
    branches: row.branches.map((link) => ({
      id: link.branch.id,
      name: link.branch.name,
      isPrimary: link.isPrimary,
    })),
  };
}

function serializeSchedule(row: {
  id: string;
  weekday: number;
  branchId: string;
  startTime: Date;
  endTime: Date;
  isOff: boolean;
}) {
  return {
    id: row.id,
    weekday: row.weekday,
    branchId: row.branchId,
    startTime: dateToClock(row.startTime),
    endTime: dateToClock(row.endTime),
    isOff: row.isOff,
  };
}
