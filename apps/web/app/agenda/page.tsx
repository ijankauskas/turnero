'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AppShell } from '../../components/app-shell';
import { apiJson } from '../../lib/session';
import type { MeResponse } from '../../lib/types';

type Professional = {
  id: string;
  displayName: string;
  color: string;
};
type Appointment = {
  id: string;
  startAt: string;
  endAt: string;
  durationMinutes: number;
  serviceNameSnapshot: string;
  status: string;
  professionalId: string;
  professional: { displayName: string; color: string };
  client: { firstName: string; lastName: string; phone: string };
};
type Client = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
};
type ServiceOffer = {
  serviceId: string;
  serviceName: string;
  durationMinutes: number;
  price: number;
};
type Branch = { id: string; name: string };

const START_HOUR = 9;
const END_HOUR = 19;
const PX_PER_MINUTE = 1.2;

function minutesInZone(iso: string, timeZone = 'America/Argentina/Buenos_Aires') {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(iso));
  const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? 0);
  const minute = Number(
    parts.find((part) => part.type === 'minute')?.value ?? 0,
  );
  return hour * 60 + minute;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function AgendaPage() {
  const [date, setDate] = useState(todayISO);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  async function load() {
    const meRow = await apiJson<MeResponse>('/auth/me');
    setMe(meRow);
    const [pros, appts] = await Promise.all([
      apiJson<Professional[]>('/professionals'),
      apiJson<Appointment[]>(`/appointments?date=${date}`),
    ]);
    setProfessionals(pros);
    setAppointments(appts);
  }

  useEffect(() => {
    void load().catch((err: Error) => setError(err.message));
  }, [date]);

  const columns = professionals;
  const height = (END_HOUR - START_HOUR) * 60 * PX_PER_MINUTE;

  return (
    <AppShell>
      <section style={{ padding: '1rem 1.25rem' }}>
        <header
          style={{
            display: 'flex',
            gap: 12,
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <h1 style={{ margin: 0 }}>Agenda</h1>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          {me && me.user.role !== 'PROFESIONAL' ? (
            <button type="button" onClick={() => setOpen(true)}>
              + Nuevo turno
            </button>
          ) : null}
        </header>
        {error ? <p role="alert">{error}</p> : null}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `72px repeat(${Math.max(columns.length, 1)}, minmax(160px, 1fr))`,
            marginTop: 16,
            background: '#fff',
            borderRadius: 12,
            overflow: 'hidden',
          }}
        >
          <div />
          {columns.map((pro) => (
            <div
              key={pro.id}
              style={{
                padding: 8,
                textAlign: 'center',
                fontWeight: 600,
                borderLeft: '1px solid #eee',
                color: pro.color,
              }}
            >
              {pro.displayName}
            </div>
          ))}
          <div style={{ position: 'relative', height }}>
            {Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  top: i * 60 * PX_PER_MINUTE,
                  fontSize: 11,
                  color: '#888',
                }}
              >
                {String(START_HOUR + i).padStart(2, '0')}:00
              </div>
            ))}
          </div>
          {columns.map((pro) => (
            <div
              key={pro.id}
              style={{
                position: 'relative',
                height,
                borderLeft: '1px solid #f0f0f0',
                backgroundImage:
                  'repeating-linear-gradient(to bottom, transparent 0, transparent 14px, #f7f7f7 15px)',
              }}
            >
              {appointments
                .filter((item) => item.professionalId === pro.id)
                .map((item) => {
                  const minutes =
                    minutesInZone(item.startAt, me?.company.timezone) -
                    START_HOUR * 60;
                  return (
                    <article
                      key={item.id}
                      style={{
                        position: 'absolute',
                        left: 6,
                        right: 6,
                        top: Math.max(minutes, 0) * PX_PER_MINUTE,
                        height: item.durationMinutes * PX_PER_MINUTE,
                        background: pro.color,
                        color: '#fff',
                        borderRadius: 8,
                        padding: 6,
                        fontSize: 12,
                        overflow: 'hidden',
                      }}
                    >
                      <strong>{item.serviceNameSnapshot}</strong>
                      <div>
                        {item.client.firstName} {item.client.lastName}
                      </div>
                    </article>
                  );
                })}
            </div>
          ))}
        </div>
        {open && me ? (
          <NewAppointmentForm
            date={date}
            timezone={me.company.timezone}
            professionals={columns}
            onClose={() => setOpen(false)}
            onCreated={() => {
              setOpen(false);
              void load();
            }}
          />
        ) : null}
      </section>
    </AppShell>
  );
}

function NewAppointmentForm({
  date,
  timezone,
  professionals,
  onClose,
  onCreated,
}: {
  date: string;
  timezone: string;
  professionals: Professional[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [offers, setOffers] = useState<ServiceOffer[]>([]);
  const [branchId, setBranchId] = useState('');
  const [professionalId, setProfessionalId] = useState(
    professionals[0]?.id ?? '',
  );
  const [clientId, setClientId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [time, setTime] = useState('10:00');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([
      apiJson<Branch[]>('/branches'),
      apiJson<Client[]>('/clients'),
    ]).then(([b, c]) => {
      setBranches(b);
      setClients(c);
      setBranchId((current) => current || b[0]?.id || '');
      setClientId((current) => current || c[0]?.id || '');
    });
  }, []);

  useEffect(() => {
    if (!professionalId) return;
    void apiJson<ServiceOffer[]>(`/professionals/${professionalId}/services`).then(
      (rows) => {
        setOffers(rows);
        setServiceId(rows[0]?.serviceId ?? '');
      },
    );
  }, [professionalId]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      const offset =
        timezone === 'America/Argentina/Buenos_Aires' ? '-03:00' : '';
      await apiJson('/appointments', {
        method: 'POST',
        body: JSON.stringify({
          branchId,
          professionalId,
          clientId,
          serviceId,
          startAt: offset
            ? `${date}T${time}:00${offset}`
            : new Date(`${date}T${time}:00`).toISOString(),
        }),
      });
      onCreated();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.35)',
        display: 'grid',
        placeItems: 'center',
      }}
    >
      <form
        onSubmit={onSubmit}
        style={{
          background: '#fff',
          padding: 20,
          borderRadius: 12,
          width: 420,
          display: 'grid',
          gap: 8,
        }}
      >
        <h2 style={{ margin: 0 }}>Nuevo turno</h2>
        <label>
          Sucursal
          <select
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
          >
            {branches.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Profesional
          <select
            value={professionalId}
            onChange={(e) => setProfessionalId(e.target.value)}
          >
            {professionals.map((row) => (
              <option key={row.id} value={row.id}>
                {row.displayName}
              </option>
            ))}
          </select>
        </label>
        <label>
          Servicio
          <select
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
          >
            {offers.map((row) => (
              <option key={row.serviceId} value={row.serviceId}>
                {row.serviceName} ({row.durationMinutes} min)
              </option>
            ))}
          </select>
        </label>
        <label>
          Cliente
          <select
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
          >
            {clients.map((row) => (
              <option key={row.id} value={row.id}>
                {row.lastName}, {row.firstName} · {row.phone}
              </option>
            ))}
          </select>
        </label>
        <label>
          Hora
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </label>
        {error ? <p role="alert">{error}</p> : null}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit">Guardar</button>
        </div>
      </form>
    </div>
  );
}
