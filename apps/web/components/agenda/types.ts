export type AgendaView = 'day' | 'week' | 'month';

export type Professional = {
  id: string;
  displayName: string;
  color: string;
  branches?: Array<{ id: string; name: string }>;
};

export type Appointment = {
  id: string;
  startAt: string;
  endAt: string;
  durationMinutes: number;
  serviceNameSnapshot: string;
  status: string;
  paid: boolean;
  price: number;
  observations: string | null;
  internalNotes: string | null;
  cancelReason: string | null;
  professionalId: string;
  branchId: string;
  clientId: string;
  serviceId: string;
  professional: { id?: string; displayName: string; color: string };
  client: {
    id?: string;
    firstName: string;
    lastName: string;
    phone: string;
    email?: string | null;
  };
  branch: { id?: string; name: string };
};

export type Branch = { id: string; name: string };

export type Client = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
};

export type ServiceOffer = {
  serviceId: string;
  serviceName: string;
  durationMinutes: number;
  price: number;
};

export type DailyReport = {
  date: string;
  count: number;
  facturado: number;
  averageTicket: number;
  occupiedMinutes: number;
  scheduledMinutes: number;
  occupancyPercent: number;
};

export type LiveReport = {
  date: string;
  next: {
    id: string;
    startAt: string;
    serviceNameSnapshot: string;
    client: { firstName: string; lastName: string };
    professional: { displayName: string };
  } | null;
  inProgress: Array<{
    id: string;
    startAt: string;
    serviceNameSnapshot: string;
    client: { firstName: string; lastName: string };
    professional: { displayName: string };
  }>;
};

export const STATUS_LABEL: Record<string, string> = {
  RESERVADO: 'Reservado',
  CONFIRMADO: 'Confirmado',
  ATENDIDO: 'Atendido',
  CANCELADO: 'Cancelado',
  NO_ASISTIO: 'No asistió',
};

export const VISIBLE_STATUSES = new Set([
  'RESERVADO',
  'CONFIRMADO',
  'ATENDIDO',
  'NO_ASISTIO',
]);
