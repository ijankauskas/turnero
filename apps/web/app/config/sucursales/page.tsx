'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AppShell } from '../../../components/app-shell';
import { apiJson } from '../../../lib/session';

type Branch = { id: string; name: string; address: string | null; phone: string | null };

export default function ConfigSucursalesPage() {
  const [rows, setRows] = useState<Branch[]>([]);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setRows(await apiJson<Branch[]>('/branches'));
  }

  useEffect(() => {
    void load().catch((err: Error) => setError(err.message));
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    try {
      await apiJson('/branches', {
        method: 'POST',
        body: JSON.stringify({ name }),
      });
      setName('');
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <AppShell>
      <section style={{ padding: '1.25rem' }}>
        <h1>Sucursales</h1>
        {error ? <p role="alert">{error}</p> : null}
        <ul>
          {rows.map((row) => (
            <li key={row.id}>
              {row.name} {row.address ? `· ${row.address}` : ''}
            </li>
          ))}
        </ul>
        <form onSubmit={onSubmit}>
          <input
            placeholder="Nueva sucursal"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <button type="submit">Agregar</button>
        </form>
      </section>
    </AppShell>
  );
}
