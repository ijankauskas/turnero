export const USER_ROLES = [
  'ADMINISTRADOR',
  'ENCARGADO',
  'RECEPCION',
  'PROFESIONAL',
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const APPOINTMENT_STATUSES = [
  'RESERVADO',
  'CONFIRMADO',
  'ATENDIDO',
  'CANCELADO',
  'NO_ASISTIO',
] as const;

export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export const REMUNERATION_TYPES = ['PERCENT', 'FIXED'] as const;
export type RemunerationType = (typeof REMUNERATION_TYPES)[number];

export const NOTIFICATION_CHANNELS = ['EMAIL', 'WHATSAPP'] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export const NOTIFICATION_TYPES = [
  'CREATED',
  'UPDATED',
  'CANCELLED',
  'REMINDER_24H',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const NOTIFICATION_STATUSES = ['PENDING', 'SENT', 'FAILED'] as const;
export type NotificationStatus = (typeof NOTIFICATION_STATUSES)[number];

export const SCHEDULE_EXCEPTION_TYPES = ['OFF', 'CUSTOM'] as const;
export type ScheduleExceptionType = (typeof SCHEDULE_EXCEPTION_TYPES)[number];

export const PAYMENT_METHODS = [
  'EFECTIVO',
  'TRANSFERENCIA',
  'TARJETA',
  'OTRO',
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

/** ISO weekday: 0 = lunes … 6 = domingo (documento maestro §4.6). */
export const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const;
export type Weekday = (typeof WEEKDAYS)[number];
