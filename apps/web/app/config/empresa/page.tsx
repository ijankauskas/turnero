'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AppShell } from '../../../components/app-shell';
import { apiJson } from '../../../lib/session';

type Company = {
  name: string;
  primaryColor: string | null;
  secondaryColor: string | null;
  contactEmail: string;
  contactPhone: string | null;
  timezone: string;
};

export default function ConfigEmpresaPage() {
  const [row, setRow] = useState<Company | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void apiJson<Company>('/company')
      .then(setRow)
      .catch((err: Error) => setError(err.message));
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!row) return;
    try {
      const saved = await apiJson<Company>('/company', {
        method: 'PATCH',
        body: JSON.stringify({
          name: row.name,
          primaryColor: row.primaryColor,
          secondaryColor: row.secondaryColor,
          contactEmail: row.contactEmail,
          contactPhone: row.contactPhone,
          timezone: row.timezone,
        }),
      });
      setRow(saved);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <AppShell>
      <section style={{ padding: '1.25rem' }}>
        <h1>Empresa</h1>
        {error ? <p role="alert">{error}</p> : null}
        {row ? (
          <form onSubmit={onSubmit} style={{ display: 'grid', gap: 8, maxWidth: 360 }}>
            <input
              value={row.name}
              onChange={(e) => setRow({ ...row, name: e.target.value })}
            />
            <input
              value={row.primaryColor ?? ''}
              onChange={(e) => setRow({ ...row, primaryColor: e.target.value })}
            />
            <input
              value={row.contactEmail}
              onChange={(e) => setRow({ ...row, contactEmail: e.target.value })}
            />
            <button type="submit">Guardar</button>
          </form>
        ) : null}
      </section>
    </AppShell>
  );
}
