import type { AppointmentStatus } from '@turnero/shared';

const TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  RESERVADO: ['CONFIRMADO', 'CANCELADO', 'NO_ASISTIO', 'ATENDIDO'],
  CONFIRMADO: ['ATENDIDO', 'CANCELADO', 'NO_ASISTIO'],
  ATENDIDO: ['CONFIRMADO'],
  CANCELADO: [],
  NO_ASISTIO: ['ATENDIDO'],
};

export function canTransition(
  from: AppointmentStatus,
  to: AppointmentStatus,
  role: string,
): boolean {
  if (from === to) {
    return true;
  }
  const allowed = TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) {
    return false;
  }
  if (from === 'ATENDIDO' && to === 'CONFIRMADO') {
    return role === 'ADMINISTRADOR';
  }
  if (from === 'NO_ASISTIO' && to === 'ATENDIDO') {
    return role === 'ADMINISTRADOR';
  }
  return true;
}
