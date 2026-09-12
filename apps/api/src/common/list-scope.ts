import type { AuthenticatedUser } from '../auth/auth.types';

export function scopedAppointmentQuery(
  user: AuthenticatedUser,
  query: { branchId?: string; professionalId?: string },
): { branchId?: string; professionalId?: string } {
  if (user.role === 'PROFESIONAL') {
    return {
      professionalId: user.professionalId ?? '__none__',
      branchId: query.branchId,
    };
  }
  if (user.role === 'ENCARGADO' || user.role === 'RECEPCION') {
    return {
      branchId: user.branchId ?? '__none__',
      professionalId: query.professionalId,
    };
  }
  return {
    branchId: query.branchId,
    professionalId: query.professionalId,
  };
}

export function canWriteAppointments(user: AuthenticatedUser): boolean {
  return (
    user.role === 'ADMINISTRADOR' ||
    user.role === 'ENCARGADO' ||
    user.role === 'RECEPCION'
  );
}
