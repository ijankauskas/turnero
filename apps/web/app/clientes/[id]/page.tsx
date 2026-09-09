'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { AppShell } from '../../../components/app-shell';
import { apiJson } from '../../../lib/session';

type Detail = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  notes: string | null;
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void apiJson<Detail>(`/clients/${params.id}`)
      .then(setRow)
      .catch((err: Error) => setError(err.message));
  }, [params.id]);

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
            <p>Email: {row.email ?? '—'}</p>
            <p>{row.notes}</p>
            <h2>Historial</h2>
            <ul>
              {row.appointments.map((item) => (
                <li key={item.id}>
                  {new Date(item.startAt).toLocaleString('es-AR')} ·{' '}
                  {item.serviceNameSnapshot} · {item.professional.displayName} ·{' '}
                  {item.status}
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </section>
    </AppShell>
  );
}
