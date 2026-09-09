import type { NotificationType } from '@turnero/shared';

export type AppointmentMailInput = {
  type: NotificationType;
  companyName: string;
  clientFirstName: string;
  serviceName: string;
  professionalName: string;
  branchName: string;
  startAt: Date;
  timeZone: string;
};

const SUBJECTS: Record<Exclude<NotificationType, 'REMINDER_24H'>, string> = {
  CREATED: 'Tu turno fue reservado',
  UPDATED: 'Tu turno fue modificado',
  CANCELLED: 'Tu turno fue cancelado',
};

export function formatAppointmentWhen(startAt: Date, timeZone: string) {
  const fecha = new Intl.DateTimeFormat('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone,
  }).format(startAt);
  const hora = new Intl.DateTimeFormat('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone,
  }).format(startAt);
  return { fecha, hora };
}

export function buildAppointmentEmail(input: AppointmentMailInput) {
  if (input.type === 'REMINDER_24H') {
    throw new Error('El recordatorio 24 h no está en el MVP');
  }
  const { fecha, hora } = formatAppointmentWhen(input.startAt, input.timeZone);
  const subject = SUBJECTS[input.type];
  const text = [
    `Hola ${input.clientFirstName},`,
    '',
    `Te contactamos de ${input.companyName}.`,
    '',
    subject + ':',
    '',
    `📅 ${fecha}`,
    `🕐 ${hora} hs`,
    `💅 ${input.serviceName}`,
    `👩 Profesional: ${input.professionalName}`,
    `📍 Sucursal ${input.branchName}`,
    '',
    '¡Te esperamos!',
  ].join('\n');
  return { subject, text };
}
