'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '../../components/app-shell';
import { apiJson } from '../../lib/session';
import type { MeResponse } from '../../lib/types';

type Item = {
  professionalId: string;
  name: string;
  turnos: number;
  facturado: number;
  aPagar: number;
};

type Daily = {
  count: number;
  facturado: number;
  averageTicket: number;
  occupancyPercent: number;
};

type Branch = { id: string; name: string };

export default function ReportesPage() {
  const [from, setFrom] = useState('2026-09-01');
  const [to, setTo] = useState('2026-09-30');
  const [branchId, setBranchId] = useState('');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [daily, setDaily] = useState<Daily | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<string>('');

  async function load() {
    const me = await apiJson<MeResponse>('/auth/me');
    setRole(me.user.role);
    const branchRows = await apiJson<Branch[]>('/branches');
    setBranches(branchRows);
    const qs = branchId ? `&branchId=${branchId}` : '';
    if (me.user.role === 'ADMINISTRADOR' || me.user.role === 'ENCARGADO') {
      const data = await apiJson<{ items: Item[] }>(
        `/reports/professionals?from=${from}T00:00:00.000Z&to=${to}T23:59:59.000Z${qs}`,
      );
      setItems(data.items);
    }
    const day = await apiJson<Daily>(
      `/reports/daily?date=${from}${qs}`,
    );
    setDaily(day);
  }

  useEffect(() => {
    void load().catch((err: Error) => setError(err.message));
  }, []);

  return (
    <AppShell>
      <section style={{ padding: '1.25rem' }}>
        <h1>Reportes</h1>
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        {role === 'ADMINISTRADOR' ? (
          <select
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
          >
            <option value="">Todas</option>
            {branches.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name}
              </option>
            ))}
          </select>
        ) : null}
        <button type="button" onClick={() => void load()}>
          Actualizar
        </button>
        {error ? <p role="alert">{error}</p> : null}
        {daily ? (
          <p>
            Cifras del {from}: {daily.count} turnos · $
            {daily.facturado.toLocaleString('es-AR')} · ocupación{' '}
            {daily.occupancyPercent}%
          </p>
        ) : null}
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
