'use client';

import { FormEvent, useEffect, useState } from 'react';
import { apiJson } from '../../lib/session';
import { formatClock, formatLongInstant } from '../../lib/datetime';
import type { Appointment } from './types';
import { STATUS_LABEL } from './types';

const NEXT: Record<string, string[]> = {
  RESERVADO: ['CONFIRMADO', 'ATENDIDO', 'NO_ASISTIO'],
  CONFIRMADO: ['ATENDIDO', 'NO_ASISTIO'],
  ATENDIDO: [],
  CANCELADO: [],
  NO_ASISTIO: [],
};

export function AppointmentPanel({
  appointment,
  timeZone,
  canWrite,
  onClose,
  onChanged,
}: {
  appointment: Appointment;
  timeZone: string;
  canWrite: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [wa, setWa] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  useEffect(() => {
    setWa(null);
    setError(null);
    void apiJson<{ url: string }>(
      `/appointments/${appointment.id}/whatsapp-link`,
    ).then((row) => setWa(row.url));
  }, [appointment.id]);

  async function setStatus(status: string) {
    setError(null);
    try {
      await apiJson(`/appointments/${appointment.id}/status`, {
        method: 'POST',
        body: JSON.stringify({ status }),
      });
      onChanged();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function setPaid(paid: boolean) {
    setError(null);
    try {
      await apiJson(`/appointments/${appointment.id}/paid`, {
        method: 'POST',
        body: JSON.stringify({ paid }),
      });
      onChanged();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function cancel(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await apiJson(`/appointments/${appointment.id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason: reason || undefined }),
      });
      onChanged();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const dateLabel = formatLongInstant(appointment.startAt, timeZone);

  return (
    <aside
      style={{
        width: 340,
        background: '#fff',
        borderRadius: 12,
        padding: 16,
        boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
        alignSelf: 'flex-start',
      }}
    >
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <h2 style={{ margin: 0, fontSize: 18 }}>{appointment.serviceNameSnapshot}</h2>
        <button type="button" onClick={onClose}>
          Cerrar
        </button>
      </header>
      <p style={{ textTransform: 'capitalize' }}>{dateLabel}</p>
      <p>
        {formatClock(appointment.startAt, timeZone)} –{' '}
        {formatClock(appointment.endAt, timeZone)} hs
      </p>
      <p>
        {appointment.client.firstName} {appointment.client.lastName}
        <br />
        {appointment.client.phone}
      </p>
      <p>Profesional: {appointment.professional.displayName}</p>
      <p>Sucursal: {appointment.branch.name}</p>
      <p>
        Estado: <strong>{STATUS_LABEL[appointment.status] ?? appointment.status}</strong>
      </p>
      <p>${appointment.price.toLocaleString('es-AR')}</p>
      {appointment.observations ? <p>Obs.: {appointment.observations}</p> : null}
      {error ? <p role="alert">{error}</p> : null}
      {wa ? (
        <p>
          <a href={wa} target="_blank" rel="noreferrer">
            Hablar por WhatsApp
          </a>
        </p>
      ) : null}
      {canWrite && appointment.status !== 'CANCELADO' ? (
        <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
          <label>
            <input
              type="checkbox"
              checked={appointment.paid}
              onChange={(e) => void setPaid(e.target.checked)}
            />{' '}
            Pagado
          </label>
          {NEXT[appointment.status]?.map((status) => (
            <button key={status} type="button" onClick={() => void setStatus(status)}>
              Marcar {STATUS_LABEL[status]}
            </button>
          ))}
          <form onSubmit={cancel} style={{ display: 'grid', gap: 6 }}>
            <input
              placeholder="Motivo (opcional)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <button type="submit">Cancelar turno</button>
          </form>
        </div>
      ) : null}
    </aside>
  );
}
