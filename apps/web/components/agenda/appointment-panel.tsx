'use client';

import { FormEvent, useEffect, useState } from 'react';
import { apiJson } from '../../lib/session';
import {
  dateInZone,
  formatClock,
  formatLongInstant,
  zonedLocalToUtc,
} from '../../lib/datetime';
import type { Appointment } from './types';
import { appointmentPriceLabel, STATUS_LABEL } from './types';
import {
  Alert,
  btnDanger,
  btnGhost,
  btnPrimary,
  cardClass,
  cn,
  inputClass,
  labelClass,
  textareaClass,
} from '../ui';

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
  const [observations, setObservations] = useState(
    appointment.observations ?? '',
  );
  const [internalNotes, setInternalNotes] = useState(
    appointment.internalNotes ?? '',
  );
  const [time, setTime] = useState(formatClock(appointment.startAt, timeZone));
  const [priceInput, setPriceInput] = useState(
    appointment.pricePending ? '' : String(appointment.price),
  );

  useEffect(() => {
    setWa(null);
    setError(null);
    setObservations(appointment.observations ?? '');
    setInternalNotes(appointment.internalNotes ?? '');
    setTime(formatClock(appointment.startAt, timeZone));
    setPriceInput(
      appointment.pricePending ? '' : String(appointment.price),
    );
    void apiJson<{ url: string }>(
      `/appointments/${appointment.id}/whatsapp-link`,
    ).then((row) => setWa(row.url));
  }, [appointment, timeZone]);

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

  async function saveTime(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      const date = dateInZone(new Date(appointment.startAt), timeZone);
      await apiJson(`/appointments/${appointment.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          startAt: zonedLocalToUtc(date, time, timeZone).toISOString(),
        }),
      });
      onChanged();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function saveNotes(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await apiJson(`/appointments/${appointment.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          observations: observations || null,
          internalNotes: internalNotes || null,
        }),
      });
      onChanged();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function savePrice(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await apiJson(`/appointments/${appointment.id}/price`, {
        method: 'POST',
        body: JSON.stringify({ price: Number(priceInput) }),
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
  const clientId = appointment.client.id ?? appointment.clientId;

  return (
    <aside className={cn(cardClass, 'sticky top-4 w-full max-w-[360px] self-start p-5')}>
      <header className="mb-3 flex items-start justify-between gap-3">
        <h2 className="m-0 text-lg font-semibold leading-tight">
          {appointment.serviceNameSnapshot}
        </h2>
        <button type="button" onClick={onClose} className={btnGhost}>
          Cerrar
        </button>
      </header>
      <p className="capitalize text-muted">{dateLabel}</p>
      <p className="text-sm">
        {formatClock(appointment.startAt, timeZone)} –{' '}
        {formatClock(appointment.endAt, timeZone)} hs
      </p>
      {canWrite && appointment.status !== 'CANCELADO' ? (
        <form
          onSubmit={saveTime}
          className="mt-3 flex flex-wrap items-end gap-2"
        >
          <label className={labelClass}>
            Hora
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className={cn(inputClass, 'w-auto')}
            />
          </label>
          <button type="submit" className={btnGhost}>
            Cambiar hora
          </button>
        </form>
      ) : null}
      <div className="mt-4 space-y-1 text-sm">
        <p className="font-medium">
          {appointment.client.firstName} {appointment.client.lastName}
        </p>
        <p className="text-muted">{appointment.client.phone}</p>
        {clientId ? (
          <a
            href={`/clientes/${clientId}`}
            className="text-sm underline decoration-line underline-offset-4"
          >
            Ver ficha
          </a>
        ) : null}
      </div>
      <p className="mt-3 text-sm">
        Profesional: {appointment.professional.displayName}
      </p>
      <p className="text-sm">Sucursal: {appointment.branch.name}</p>
      <p className="mt-2 text-sm">
        Estado:{' '}
        <strong>{STATUS_LABEL[appointment.status] ?? appointment.status}</strong>
      </p>
      <p className="mt-2 text-lg font-semibold tabular-nums">
        {appointmentPriceLabel(appointment)}
      </p>
      {appointment.pricePending ? (
        <p className="mt-1 text-sm text-muted">
          El profesional te dice qué se hizo; cargá el importe y confirmá.
        </p>
      ) : null}
      {canWrite && appointment.status !== 'CANCELADO' && !appointment.paid ? (
        <form
          onSubmit={savePrice}
          className="mt-3 flex flex-wrap items-end gap-2"
        >
          <label className={labelClass}>
            Importe
            <input
              type="number"
              min={1}
              step="1"
              required
              value={priceInput}
              onChange={(e) => setPriceInput(e.target.value)}
              placeholder="0"
              className={cn(inputClass, 'w-32')}
            />
          </label>
          <button type="submit" className={btnPrimary}>
            {appointment.pricePending ? 'Confirmar precio' : 'Actualizar precio'}
          </button>
        </form>
      ) : null}
      {canWrite ? (
        <form onSubmit={saveNotes} className="mt-4 grid gap-3">
          <label className={labelClass}>
            Observaciones (cliente)
            <textarea
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              rows={2}
              className={textareaClass}
            />
          </label>
          <label className={labelClass}>
            Notas internas
            <textarea
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              rows={2}
              className={textareaClass}
            />
          </label>
          <button type="submit" className={btnGhost}>
            Guardar notas
          </button>
        </form>
      ) : appointment.observations ? (
        <p className="text-sm">Obs.: {appointment.observations}</p>
      ) : null}
      {error ? (
        <div className="mt-3">
          <Alert>{error}</Alert>
        </div>
      ) : null}
      {wa ? (
        <p className="mt-3">
          <a
            href={wa}
            target="_blank"
            rel="noreferrer"
            className="text-sm underline decoration-line underline-offset-4"
          >
            Hablar por WhatsApp
          </a>
        </p>
      ) : null}
      {canWrite && appointment.status !== 'CANCELADO' ? (
        <div className="mt-4 grid gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={appointment.paid}
              disabled={appointment.pricePending}
              onChange={(e) => void setPaid(e.target.checked)}
              className="size-4 rounded border-line"
            />
            Pagado
          </label>
          {appointment.pricePending ? (
            <p className="text-xs text-muted">
              Definí el precio antes de marcarlo pagado.
            </p>
          ) : null}
          {NEXT[appointment.status]?.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => void setStatus(status)}
              className={btnPrimary}
            >
              Marcar {STATUS_LABEL[status]}
            </button>
          ))}
          <form onSubmit={cancel} className="grid gap-2">
            <input
              placeholder="Motivo (opcional)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className={inputClass}
            />
            <button type="submit" className={btnDanger}>
              Cancelar turno
            </button>
          </form>
        </div>
      ) : null}
    </aside>
  );
}
