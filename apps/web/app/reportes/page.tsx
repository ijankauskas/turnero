'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '../../components/app-shell';
import { apiJson } from '../../lib/session';

type Item = {
  professionalId: string;
  name: string;
  turnos: number;
  facturado: number;
  aPagar: number;
};

export default function ReportesPage() {
  const [from, setFrom] = useState('2026-09-01');
  const [to, setTo] = useState('2026-09-30');
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const data = await apiJson<{ items: Item[] }>(
      `/reports/professionals?from=${from}T00:00:00.000Z&to=${to}T23:59:59.000Z`,
    );
    setItems(data.items);
  }

  useEffect(() => {
    void load().catch((err: Error) => setError(err.message));
  }, []);

  return (
    <AppShell>
      <section style={{ padding: '1.25rem' }}>
        <h1>Reportes</h1>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        <button type="button" onClick={() => void load()}>
          Actualizar
        </button>
        {error ? <p role="alert">{error}</p> : null}
        <table style={{ width: '100%', marginTop: 16, background: '#fff' }}>
          <thead>
            <tr>
              <th align="left">Persona</th>
              <th>Turnos</th>
              <th>Facturado</th>
              <th>A pagar</th>
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr key={row.professionalId}>
                <td>{row.name}</td>
                <td align="center">{row.turnos}</td>
                <td align="right">${row.facturado.toLocaleString('es-AR')}</td>
                <td align="right">${row.aPagar.toLocaleString('es-AR')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </AppShell>
  );
}
