import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import { parseDateOnly } from '../common/clock';
import { TenantPrismaFactory } from '../tenant/tenant-prisma.service';
import type { UpsertNoteDto } from './dto/note.dto';

@Injectable()
export class NotesService {
  constructor(private readonly tenants: TenantPrismaFactory) {}

  async get(user: AuthenticatedUser, date: string, branchId?: string) {
    this.assertStaff(user);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? '')) {
      throw new BadRequestException('Fecha inválida');
    }
    const resolved = this.resolveBranch(user, branchId);
    const db = this.tenants.forCompany(user.companyId);
    const row = await db.dailyNote.findFirst({
      where: { branchId: resolved, date: parseDateOnly(date) },
    });
    return {
      date,
      branchId: resolved,
      body: row?.body ?? '',
      id: row?.id ?? null,
    };
  }

  async upsert(user: AuthenticatedUser, dto: UpsertNoteDto) {
    this.assertStaff(user);
    const branchId = this.resolveBranch(user, dto.branchId);
    const db = this.tenants.forCompany(user.companyId);
    const branch = await db.branch.findFirst({
      where: { id: branchId, deletedAt: null },
    });
    if (!branch) {
      throw new BadRequestException('Sucursal inválida');
    }
    const date = parseDateOnly(dto.date);
    const existing = await db.dailyNote.findFirst({
      where: { branchId, date },
    });
    const row = existing
      ? await db.dailyNote.update({
          where: { id: existing.id },
          data: { body: dto.body },
        })
      : await db.dailyNote.create({
          data: {
            companyId: user.companyId,
            branchId,
            date,
            body: dto.body,
          },
        });
    return {
      id: row.id,
      date: dto.date,
      branchId,
      body: row.body,
    };
  }

  private assertStaff(user: AuthenticatedUser) {
    if (user.role === 'PROFESIONAL') {
      throw new ForbiddenException('El profesional no edita las notas del día');
    }
  }

  private resolveBranch(user: AuthenticatedUser, branchId?: string) {
    if (user.role === 'ENCARGADO' || user.role === 'RECEPCION') {
      if (branchId && branchId !== user.branchId) {
        throw new ForbiddenException('No tenés acceso a esta sucursal');
      }
      if (!user.branchId) {
        throw new ForbiddenException('Tu usuario no tiene sucursal');
      }
      return user.branchId;
    }
    if (!branchId) {
      throw new BadRequestException('Elegí una sucursal');
    }
    return branchId;
  }
}
