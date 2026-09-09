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
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void apiJson<Company>('/company')
      .then(setRow)
      .catch((err: Error) => setError(err.message));
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!row) return;
    setSaved(false);
    try {
      const next = await apiJson<Company>('/company', {
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
      setRow(next);
      setSaved(true);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <AppShell>
      <section style={{ padding: '1.25rem' }}>
        <h1>Empresa</h1>
        {error ? <p role="alert">{error}</p> : null}
        {saved ? <p>Guardado. Recargá para ver el branding en el menú.</p> : null}
        {row ? (
          <form onSubmit={onSubmit} style={{ display: 'grid', gap: 8, maxWidth: 360 }}>
            <label>
              Nombre
              <input
                value={row.name}
                onChange={(e) => setRow({ ...row, name: e.target.value })}
              />
            </label>
            <label>
              Color principal
              <input
                type="color"
                value={row.primaryColor || '#1a1a1a'}
                onChange={(e) => setRow({ ...row, primaryColor: e.target.value })}
              />
            </label>
            <label>
              Color de fondo
              <input
                type="color"
                value={row.secondaryColor || '#f6f4f1'}
                onChange={(e) =>
                  setRow({ ...row, secondaryColor: e.target.value })
                }
              />
            </label>
            <label>
              Email de contacto
              <input
                type="email"
                value={row.contactEmail}
                onChange={(e) => setRow({ ...row, contactEmail: e.target.value })}
              />
            </label>
            <label>
              Teléfono
              <input
                value={row.contactPhone ?? ''}
                onChange={(e) =>
                  setRow({ ...row, contactPhone: e.target.value || null })
                }
              />
            </label>
            <label>
              Zona horaria
              <input
                value={row.timezone}
                onChange={(e) => setRow({ ...row, timezone: e.target.value })}
              />
            </label>
            <button type="submit">Guardar</button>
          </form>
        ) : null}
      </section>
    </AppShell>
  );
}
