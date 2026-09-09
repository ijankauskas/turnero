'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AppShell } from '../../components/app-shell';
import { apiJson } from '../../lib/session';
import type { MeResponse } from '../../lib/types';

type Service = {
  id: string;
  name: string;
  durationMinutes: number;
  basePrice: number;
  active: boolean;
};

export default function PrestacionesPage() {
  const [rows, setRows] = useState<Service[]>([]);
  const [name, setName] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [basePrice, setBasePrice] = useState(10000);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  async function load() {
    const me = await apiJson<MeResponse>('/auth/me');
    setIsAdmin(me.user.role === 'ADMINISTRADOR');
    setRows(await apiJson<Service[]>('/services'));
  }

  useEffect(() => {
    void load().catch((err: Error) => setError(err.message));
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    try {
      await apiJson('/services', {
        method: 'POST',
        body: JSON.stringify({ name, durationMinutes, basePrice }),
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
        <h1>Prestaciones</h1>
        {error ? <p role="alert">{error}</p> : null}
        <ul>
          {rows.map((row) => (
            <li key={row.id}>
              {row.name} · {row.durationMinutes} min · $
              {row.basePrice.toLocaleString('es-AR')}
            </li>
          ))}
        </ul>
        {isAdmin ? (
          <form onSubmit={onSubmit} style={{ display: 'grid', gap: 8, maxWidth: 320 }}>
            <input
              placeholder="Nombre"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <input
              type="number"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
            />
            <input
              type="number"
              value={basePrice}
              onChange={(e) => setBasePrice(Number(e.target.value))}
            />
            <button type="submit">Agregar</button>
          </form>
        ) : null}
      </section>
    </AppShell>
  );
}
