import { ForbiddenException } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';

export function assertBranchAccess(
  user: AuthenticatedUser,
  branchId: string,
): void {
  if (user.role === 'ADMINISTRADOR') {
    return;
  }
  if (
    (user.role === 'ENCARGADO' || user.role === 'RECEPCION') &&
    user.branchId === branchId
  ) {
    return;
  }
  throw new ForbiddenException('No tenés acceso a esta sucursal');
}

export function assertProfessionalSelf(
  user: AuthenticatedUser,
  professionalId: string,
): void {
  if (user.role !== 'PROFESIONAL') {
    return;
  }
  if (user.professionalId !== professionalId) {
    throw new ForbiddenException('No tenés acceso a la agenda de otro profesional');
  }
}
