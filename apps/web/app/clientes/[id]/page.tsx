'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { AppShell } from '../../../components/app-shell';
import { formatLongInstant } from '../../../lib/datetime';
import { STATUS_LABEL } from '../../../lib/labels';
import { apiJson } from '../../../lib/session';
import type { MeResponse } from '../../../lib/types';
import {
  Alert,
  btnDanger,
  btnPrimary,
  cardClass,
  cn,
  inputClass,
  labelClass,
  Page,
  textareaClass,
} from '../../../components/ui';

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
      <Page>
        <p className="mb-4">
          <a
            href="/clientes"
            className="text-sm text-muted underline decoration-line underline-offset-4"
          >
            ← Clientes
          </a>
        </p>
        {error ? <Alert>{error}</Alert> : null}
        {row ? (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_1fr]">
            <div className={cn(cardClass, 'p-5')}>
              <h1 className="mt-0 text-2xl font-semibold">
                {row.lastName}, {row.firstName}
              </h1>
              <p className="text-muted">Tel: {row.phone}</p>
              {canWrite ? (
                <form onSubmit={onSave} className="mt-4 grid gap-3">
                  <label className={labelClass}>
                    Email
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={inputClass}
                    />
                  </label>
                  <label className={labelClass}>
                    Notas
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      className={textareaClass}
                    />
                  </label>
                  <button type="submit" className={btnPrimary}>
                    Guardar ficha
                  </button>
                  {saved ? (
                    <p className="text-sm text-muted">Guardado.</p>
                  ) : null}
                  {row.active !== false ? (
                    <button
                      type="button"
                      className={btnDanger}
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
                    <p className="text-sm text-muted">
                      Cliente inactivo: no aparece en el alta de turnos.
                    </p>
                  )}
                </form>
              ) : (
                <>
                  <p>Email: {row.email ?? '—'}</p>
                  <p>{row.notes}</p>
                </>
              )}
            </div>
            <div className={cn(cardClass, 'p-5')}>
              <h2 className="mt-0 text-lg font-semibold">Historial</h2>
              {row.appointments.length === 0 ? (
                <p className="text-sm text-muted">Sin turnos.</p>
              ) : (
                <ul className="m-0 grid list-none gap-2 p-0">
                  {row.appointments.map((item) => (
                    <li
                      key={item.id}
                      className="rounded-lg border border-line bg-canvas px-3 py-2 text-sm"
                    >
                      {formatLongInstant(item.startAt, timezone)} ·{' '}
                      {item.serviceNameSnapshot} · {item.professional.displayName}{' '}
                      · {STATUS_LABEL[item.status] ?? item.status}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : null}
      </Page>
    </AppShell>
  );
}
