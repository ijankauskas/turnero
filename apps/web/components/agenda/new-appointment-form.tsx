'use client';

import { FormEvent, useEffect, useState } from 'react';
import { apiJson } from '../../lib/session';
import { formatClock, zonedLocalToUtc } from '../../lib/datetime';
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
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.35)',
        display: 'grid',
        placeItems: 'center',
        zIndex: 20,
      }}
    >
      <form
        onSubmit={onSubmit}
        style={{
          background: '#fff',
          padding: 20,
          borderRadius: 12,
          width: 440,
          display: 'grid',
          gap: 8,
          maxHeight: '90vh',
          overflow: 'auto',
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
                {row.serviceName} ({row.durationMinutes} min) · $
                {row.price.toLocaleString('es-AR')}
              </option>
            ))}
          </select>
        </label>
        <label>
          Buscar cliente
          <input
            value={clientQuery}
            onChange={(e) => setClientQuery(e.target.value)}
            placeholder="Nombre o teléfono"
          />
        </label>
        <label>
          Cliente
          <select
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
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
          onClick={() => {
            setNewClient((current) => !current);
            setClientMatches([]);
          }}
        >
          {newClient ? 'Usar cliente existente' : 'Nuevo cliente'}
        </button>
        {newClient ? (
          <div style={{ display: 'grid', gap: 6 }}>
            <input
              placeholder="Nombre"
              value={newFirstName}
              onChange={(e) => setNewFirstName(e.target.value)}
            />
            <input
              placeholder="Apellido"
              value={newLastName}
              onChange={(e) => setNewLastName(e.target.value)}
            />
            <input
              placeholder="Teléfono"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
            />
            <button
              type="button"
              onClick={() => void createClient(false)}
              disabled={!newFirstName || !newLastName || !newPhone}
            >
              Crear cliente
            </button>
            {clientMatches.length > 0 ? (
              <>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
                  {clientMatches.map((row) => (
                    <li key={row.id}>
                      <button
                        type="button"
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
                <button type="button" onClick={() => void createClient(true)}>
                  Es otra persona: crear igual
                </button>
              </>
            ) : null}
          </div>
        ) : null}
        <label>
          Hora
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </label>
        {slots.length ? (
          <div>
            <div style={{ fontSize: 13, marginBottom: 4 }}>Horarios libres</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {slots.slice(0, 16).map((slot) => {
                const clock = formatClock(slot.startAt, timezone);
                return (
                  <button
                    key={slot.startAt}
                    type="button"
                    onClick={() => setTime(clock)}
                    style={{
                      fontWeight: clock === time ? 700 : 400,
                    }}
                  >
                    {clock}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
        <label>
          Observaciones
          <textarea
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
            rows={2}
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
