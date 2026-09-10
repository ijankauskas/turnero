'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { formatClock, formatLongDate, zonedLocalToUtc } from '../../lib/datetime';
import { apiItems } from '../../lib/paging';
import { apiJson } from '../../lib/session';
import { ClientCombobox } from '../client-combobox';
import { Select } from '../select';
import {
  Alert,
  btnGhost,
  btnPrimary,
  cardClass,
  cn,
  inputClass,
  labelClass,
  textareaClass,
} from '../ui';
import type { Branch, Client, Professional, ServiceOffer } from './types';

type Slot = { startAt: string; endAt: string };

export function NewAppointmentForm({
  date,
  timezone,
  professionals,
  initialProfessionalId,
  initialTime,
  initialBranchId,
  onClose,
  onCreated,
}: {
  date: string;
  timezone: string;
  professionals: Professional[];
  initialProfessionalId?: string;
  initialTime?: string;
  initialBranchId?: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [offers, setOffers] = useState<ServiceOffer[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [branchId, setBranchId] = useState(initialBranchId ?? '');
  const [professionalId, setProfessionalId] = useState(
    initialProfessionalId || professionals[0]?.id || '',
  );
  const [clientId, setClientId] = useState('');
  const [clientLabel, setClientLabel] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [time, setTime] = useState(initialTime ?? '10:00');
  const [observations, setObservations] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const selectedOffer = offers.find((row) => row.serviceId === serviceId);
  const professionalName =
    professionals.find((row) => row.id === professionalId)?.displayName ?? '';

  useEffect(() => {
    void apiItems<Branch>('/branches').then((rows) => {
      setBranches(rows);
      setBranchId((current) => current || initialBranchId || rows[0]?.id || '');
    });
  }, [initialBranchId]);

  useEffect(() => {
    if (!professionalId) return;
    void apiJson<ServiceOffer[]>(
      `/professionals/${professionalId}/services`,
    ).then((rows) => {
      const active = rows.filter((row) => row.active !== false);
      setOffers(active);
      setServiceId((current) =>
        active.some((row) => row.serviceId === current)
          ? current
          : (active[0]?.serviceId ?? ''),
      );
    });
  }, [professionalId]);

  useEffect(() => {
    if (!professionalId || !branchId || !serviceId || !date) {
      setSlots([]);
      return;
    }
    void apiJson<{ slots: Slot[] }>(
      `/appointments/availability?professionalId=${professionalId}&branchId=${branchId}&date=${date}&serviceId=${serviceId}`,
    )
      .then((row) => setSlots(row.slots))
      .catch(() => setSlots([]));
  }, [professionalId, branchId, serviceId, date]);

  const branchOptions = useMemo(
    () => branches.map((row) => ({ value: row.id, label: row.name })),
    [branches],
  );
  const professionalOptions = useMemo(
    () =>
      professionals.map((row) => ({
        value: row.id,
        label: row.displayName,
      })),
    [professionals],
  );
  const serviceOptions = useMemo(
    () =>
      offers.map((row) => ({
        value: row.serviceId,
        label: `${row.serviceName} (${row.durationMinutes} min) · ${
          row.openPrice
            ? 'A definir'
            : `$${row.price.toLocaleString('es-AR')}`
        }`,
      })),
    [offers],
  );

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!clientId) {
      setError('Elegí un cliente.');
      return;
    }
    setSaving(true);
    try {
      await apiJson('/appointments', {
        method: 'POST',
        body: JSON.stringify({
          branchId,
          professionalId,
          clientId,
          serviceId,
          startAt: zonedLocalToUtc(date, time, timezone).toISOString(),
          observations: observations || undefined,
        }),
      });
      onCreated();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <aside
      className={cn(
        cardClass,
        'sticky top-4 w-full max-w-[360px] self-start p-5',
      )}
    >
      <header className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="m-0 text-lg font-semibold leading-tight">
            Nuevo turno
          </h2>
          <p className="mt-1 text-sm capitalize text-muted">
            {formatLongDate(date, timezone)}
            {time ? ` · ${time}` : ''}
            {professionalName ? ` · ${professionalName}` : ''}
          </p>
        </div>
        <button type="button" onClick={onClose} className={btnGhost}>
          Cerrar
        </button>
      </header>

      <form onSubmit={onSubmit} className="grid gap-3">
        <label className={labelClass}>
          Sucursal
          <Select
            value={branchId}
            onChange={setBranchId}
            options={branchOptions}
            placeholder="Elegí sucursal"
          />
        </label>
        <label className={labelClass}>
          Profesional
          <Select
            value={professionalId}
            onChange={setProfessionalId}
            options={professionalOptions}
            placeholder="Elegí profesional"
          />
        </label>
        <label className={labelClass}>
          Servicio
          <Select
            value={serviceId}
            onChange={setServiceId}
            options={serviceOptions}
            placeholder="Elegí servicio"
          />
        </label>
        {selectedOffer?.openPrice ? (
          <p className="text-sm text-muted">
            El precio se carga después, cuando el profesional te dice qué se
            hizo.
          </p>
        ) : null}
        <label className={labelClass}>
          Hora
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className={inputClass}
            required
          />
        </label>
        {slots.length ? (
          <div>
            <div className="mb-2 text-[13px] font-medium text-muted">
              Horarios libres
            </div>
            <div className="flex flex-wrap gap-1.5">
              {slots.slice(0, 16).map((slot) => {
                const clock = formatClock(slot.startAt, timezone);
                return (
                  <button
                    key={slot.startAt}
                    type="button"
                    onClick={() => setTime(clock)}
                    className={cn(
                      'rounded-md px-3 py-1 text-sm',
                      clock === time
                        ? 'bg-accent text-white'
                        : 'bg-canvas text-ink',
                    )}
                  >
                    {clock}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        <div>
          <span className={labelClass}>Cliente</span>
          <ClientCombobox
            value={clientId}
            selectedLabel={clientLabel}
            onChange={(client: Client | null) => {
              if (!client) {
                setClientId('');
                setClientLabel('');
                return;
              }
              setClientId(client.id);
              setClientLabel(
                `${client.lastName}, ${client.firstName} · ${client.phone}`,
              );
            }}
          />
        </div>

        <label className={labelClass}>
          Observaciones
          <textarea
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
            rows={3}
            className={textareaClass}
          />
        </label>

        {error ? <Alert>{error}</Alert> : null}

        <div className="mt-1 flex flex-wrap gap-2">
          <button type="submit" className={btnPrimary} disabled={saving}>
            Guardar
          </button>
          <button type="button" onClick={onClose} className={btnGhost}>
            Cancelar
          </button>
        </div>
      </form>
    </aside>
  );
}
