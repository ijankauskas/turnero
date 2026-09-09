'use client';

import { FormEvent, useEffect, useState } from 'react';
import { apiJson } from '../../lib/session';
import { formatClock, zonedLocalToUtc } from '../../lib/datetime';
import type { Branch, Client, Professional, ServiceOffer } from './types';
import {
  Alert,
  btnGhost,
  btnPrimary,
  btnSoft,
  cn,
  inputClass,
  labelClass,
  textareaClass,
} from '../ui';

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
  const [clients, setClients] = useState<Client[]>([]);
  const [offers, setOffers] = useState<ServiceOffer[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [branchId, setBranchId] = useState(initialBranchId ?? '');
  const [professionalId, setProfessionalId] = useState(
    initialProfessionalId || professionals[0]?.id || '',
  );
  const [clientId, setClientId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [time, setTime] = useState(initialTime ?? '10:00');
  const [observations, setObservations] = useState('');
  const [clientQuery, setClientQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [newClient, setNewClient] = useState(false);
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [clientMatches, setClientMatches] = useState<Client[]>([]);

  useEffect(() => {
    void Promise.all([
      apiJson<Branch[]>('/branches'),
      apiJson<Client[]>('/clients'),
    ]).then(([b, c]) => {
      setBranches(b);
      setClients(c.filter((row) => row.active !== false));
      setBranchId((current) => current || initialBranchId || b[0]?.id || '');
      setClientId((current) => current || c[0]?.id || '');
    });
  }, [initialBranchId]);

  useEffect(() => {
    if (!professionalId) return;
    void apiJson<ServiceOffer[]>(`/professionals/${professionalId}/services`).then(
      (rows) => {
        const active = rows.filter((row) => row.active !== false);
        setOffers(active);
        setServiceId((current) =>
          active.some((row) => row.serviceId === current)
            ? current
            : (active[0]?.serviceId ?? ''),
        );
      },
    );
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

  const visibleClients = clients.filter((row) => {
    const q = clientQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      `${row.lastName} ${row.firstName}`.toLowerCase().includes(q) ||
      row.phone.includes(q)
    );
  });

  async function createClient(forceCreate = false) {
    setError(null);
    try {
      const created = await apiJson<Client>('/clients', {
        method: 'POST',
        body: JSON.stringify({
          firstName: newFirstName,
          lastName: newLastName,
          phone: newPhone,
          forceCreate,
        }),
      });
      setClients((rows) => [created, ...rows]);
      setClientId(created.id);
      setClientQuery(`${created.lastName} ${created.firstName}`);
      setNewClient(false);
      setClientMatches([]);
      setNewFirstName('');
      setNewLastName('');
      setNewPhone('');
    } catch (err) {
      const typed = err as Error & {
        status?: number;
        body?: { matches?: Client[]; error?: string };
      };
      if (typed.status === 409 && typed.body?.error === 'DUPLICATE_PHONE') {
        setClientMatches(typed.body.matches ?? []);
        setError(
          'Ya hay un cliente con ese teléfono. Elegilo o confirmá si es otra persona.',
        );
        return;
      }
      setError(typed.message);
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
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
    }
  }

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-ink/35 p-4 backdrop-blur-[2px]">
      <form
        onSubmit={onSubmit}
        className="grid max-h-[90vh] w-full max-w-[460px] gap-3 overflow-auto rounded-xl border border-line bg-paper p-6 shadow-soft"
      >
        <h2 className="m-0 text-xl font-semibold">Nuevo turno</h2>
        <label className={labelClass}>
          Sucursal
          <select
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            className={inputClass}
          >
            {branches.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name}
              </option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          Profesional
          <select
            value={professionalId}
            onChange={(e) => setProfessionalId(e.target.value)}
            className={inputClass}
          >
            {professionals.map((row) => (
              <option key={row.id} value={row.id}>
                {row.displayName}
              </option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          Servicio
          <select
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
            className={inputClass}
          >
            {offers.map((row) => (
              <option key={row.serviceId} value={row.serviceId}>
                {row.serviceName} ({row.durationMinutes} min) · $
                {row.price.toLocaleString('es-AR')}
              </option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          Buscar cliente
          <input
            value={clientQuery}
            onChange={(e) => setClientQuery(e.target.value)}
            placeholder="Nombre o teléfono"
            className={inputClass}
          />
        </label>
        <label className={labelClass}>
          Cliente
          <select
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className={inputClass}
          >
            {visibleClients.map((row) => (
              <option key={row.id} value={row.id}>
                {row.lastName}, {row.firstName} · {row.phone}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className={btnGhost}
          onClick={() => {
            setNewClient((current) => !current);
            setClientMatches([]);
          }}
        >
          {newClient ? 'Usar cliente existente' : 'Nuevo cliente'}
        </button>
        {newClient ? (
          <div className="grid gap-2 rounded-lg bg-canvas p-3">
            <input
              placeholder="Nombre"
              value={newFirstName}
              onChange={(e) => setNewFirstName(e.target.value)}
              className={inputClass}
            />
            <input
              placeholder="Apellido"
              value={newLastName}
              onChange={(e) => setNewLastName(e.target.value)}
              className={inputClass}
            />
            <input
              placeholder="Teléfono"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              className={inputClass}
            />
            <button
              type="button"
              onClick={() => void createClient(false)}
              disabled={!newFirstName || !newLastName || !newPhone}
              className={btnPrimary}
            >
              Crear cliente
            </button>
            {clientMatches.length > 0 ? (
              <>
                <ul className="m-0 list-disc pl-5 text-sm">
                  {clientMatches.map((row) => (
                    <li key={row.id}>
                      <button
                        type="button"
                        className="underline decoration-line underline-offset-4"
                        onClick={() => {
                          setClientId(row.id);
                          setClients((rows) =>
                            rows.some((item) => item.id === row.id)
                              ? rows
                              : [row, ...rows],
                          );
                          setNewClient(false);
                          setClientMatches([]);
                          setError(null);
                        }}
                      >
                        Usar {row.lastName}, {row.firstName}
                      </button>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => void createClient(true)}
                  className={btnSoft}
                >
                  Es otra persona: crear igual
                </button>
              </>
            ) : null}
          </div>
        ) : null}
        <label className={labelClass}>
          Hora
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className={inputClass}
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
        <label className={labelClass}>
          Observaciones
          <textarea
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
            rows={2}
            className={textareaClass}
          />
        </label>
        {error ? <Alert>{error}</Alert> : null}
        <div className="mt-1 flex justify-end gap-2">
          <button type="button" onClick={onClose} className={btnGhost}>
            Cancelar
          </button>
          <button type="submit" className={btnPrimary}>
            Guardar
          </button>
        </div>
      </form>
    </div>
  );
}
