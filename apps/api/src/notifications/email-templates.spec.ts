import { buildAppointmentEmail } from './email-templates';

describe('email templates (NTF-003 NTF-004 NTF-005)', () => {
  const base = {
    companyName: 'Studio Élégance',
    clientFirstName: 'Ana',
    serviceName: 'Corte',
    professionalName: 'Juan',
    branchName: 'Centro',
    startAt: new Date('2026-09-09T13:00:00.000Z'),
    timeZone: 'America/Argentina/Buenos_Aires',
  };

  it('uses locked subjects', () => {
    expect(buildAppointmentEmail({ ...base, type: 'CREATED' }).subject).toBe(
      'Tu turno fue reservado',
    );
    expect(buildAppointmentEmail({ ...base, type: 'UPDATED' }).subject).toBe(
      'Tu turno fue modificado',
    );
    expect(buildAppointmentEmail({ ...base, type: 'CANCELLED' }).subject).toBe(
      'Tu turno fue cancelado',
    );
  });

  it('renders wall time in the company timezone', () => {
    const mail = buildAppointmentEmail({ ...base, type: 'CREATED' });
    expect(mail.text).toContain('10:00');
    expect(mail.text).toContain('Studio Élégance');
    expect(mail.text).toContain('Juan');
  });
});
