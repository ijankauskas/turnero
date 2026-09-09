'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { AppShell } from '../../../components/app-shell';
import { formatLongInstant } from '../../../lib/datetime';
import { STATUS_LABEL } from '../../../lib/labels';
import { apiJson } from '../../../lib/session';
import type { MeResponse } from '../../../lib/types';

type Detail = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  notes: string | null;
  active?: boolean;
  appointments: Array<{
    id: string;
    startAt: string;
    status: string;
    serviceNameSnapshot: string;
    professional: { displayName: string };
  }>;
};

export default function ClienteFichaPage() {
  const params = useParams<{ id: string }>();
  const [row, setRow] = useState<Detail | null>(null);
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [timezone, setTimezone] = useState('America/Argentina/Buenos_Aires');
  const [canWrite, setCanWrite] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void Promise.all([
      apiJson<Detail>(`/clients/${params.id}`),
      apiJson<MeResponse>('/auth/me'),
    ])
      .then(([detail, me]) => {
        setRow(detail);
        setEmail(detail.email ?? '');
        setNotes(detail.notes ?? '');
        setTimezone(me.company.timezone);
        setCanWrite(me.user.role !== 'PROFESIONAL');
      })
      .catch((err: Error) => setError(err.message));
  }, [params.id]);

  async function onSave(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    try {
      const updated = await apiJson<{
        email: string | null;
        notes: string | null;
      }>(`/clients/${params.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          email: email || null,
          notes: notes || null,
        }),
      });
      setRow((current) =>
        current
          ? { ...current, email: updated.email, notes: updated.notes }
          : current,
      );
      setSaved(true);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <AppShell>
      <section style={{ padding: '1.25rem' }}>
        {error ? <p role="alert">{error}</p> : null}
        {row ? (
          <>
            <h1>
              {row.lastName}, {row.firstName}
            </h1>
            <p>Tel: {row.phone}</p>
            {canWrite ? (
              <form onSubmit={onSave} style={{ display: 'grid', gap: 8, maxWidth: 420 }}>
                <label>
                  Email
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </label>
                <label>
                  Notas
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                  />
                </label>
                <button type="submit">Guardar ficha</button>
                {saved ? <p>Guardado.</p> : null}
                {row.active !== false ? (
                  <button
                    type="button"
                    onClick={() =>
                      void apiJson(`/clients/${params.id}/deactivate`, {
                        method: 'POST',
                      })
                        .then(() =>
                          setRow((current) =>
                            current ? { ...current, active: false } : current,
                          ),
                        )
                        .catch((err: Error) => setError(err.message))
                    }
                  >
                    Desactivar cliente
                  </button>
                ) : (
                  <p>Cliente inactivo: no aparece en el alta de turnos.</p>
                )}
              </form>
            ) : (
              <>
                <p>Email: {row.email ?? '—'}</p>
                <p>{row.notes}</p>
              </>
            )}
            <h2>Historial</h2>
            {row.appointments.length === 0 ? (
              <p>Sin turnos.</p>
            ) : (
            <ul>
              {row.appointments.map((item) => (
                <li key={item.id}>
                  {formatLongInstant(item.startAt, timezone)} ·{' '}
                  {item.serviceNameSnapshot} · {item.professional.displayName} ·{' '}
                  {STATUS_LABEL[item.status] ?? item.status}
                </li>
              ))}
            </ul>
            )}
          </>
        ) : null}
      </section>
    </AppShell>
  );
}
