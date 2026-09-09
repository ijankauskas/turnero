'use client';

import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '../../components/app-shell';
import { monthEnd, monthStart, todayInZone } from '../../lib/datetime';
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

function money(value: number) {
  return value.toLocaleString('es-AR');
}

function csvCell(value: string | number) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

export default function ReportesPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [branchId, setBranchId] = useState('');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [daily, setDaily] = useState<Daily | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<string>('');

  async function load(nextFrom = from, nextTo = to, nextBranch = branchId) {
    const me = await apiJson<MeResponse>('/auth/me');
    setRole(me.user.role);
    if (!nextFrom || !nextTo) {
      const today = todayInZone(me.company.timezone);
      nextFrom = monthStart(today);
      nextTo = monthEnd(today);
      setFrom(nextFrom);
      setTo(nextTo);
    }
    const branchRows = await apiJson<Branch[]>('/branches');
    setBranches(branchRows);
    const qs = nextBranch ? `&branchId=${nextBranch}` : '';
    if (me.user.role === 'ADMINISTRADOR' || me.user.role === 'ENCARGADO') {
      const data = await apiJson<{ items: Item[] }>(
        `/reports/professionals?from=${nextFrom}&to=${nextTo}${qs}`,
      );
      setItems(data.items);
    }
    const day = await apiJson<Daily>(`/reports/daily?date=${nextFrom}${qs}`);
    setDaily(day);
  }

  useEffect(() => {
    void load().catch((err: Error) => setError(err.message));
  }, []);

  const totals = useMemo(
    () =>
      items.reduce(
        (acc, row) => ({
          turnos: acc.turnos + row.turnos,
          facturado: acc.facturado + row.facturado,
          aPagar: acc.aPagar + row.aPagar,
        }),
        { turnos: 0, facturado: 0, aPagar: 0 },
      ),
    [items],
  );

  function downloadCsv() {
    const header = ['Persona', 'Turnos', 'Facturado', 'A pagar'].join(';');
    const lines = items.map((row) =>
      [csvCell(row.name), row.turnos, row.facturado, row.aPagar].join(';'),
    );
    lines.push(
      [csvCell('Total'), totals.turnos, totals.facturado, totals.aPagar].join(
        ';',
      ),
    );
    const blob = new Blob([`\uFEFF${[header, ...lines].join('\n')}`], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reportes-${from}-${to}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AppShell allow={['ADMINISTRADOR', 'ENCARGADO']}>
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
        <button type="button" onClick={downloadCsv} disabled={!items.length}>
          Descargar CSV
        </button>
        {error ? <p role="alert">{error}</p> : null}
        {daily ? (
          <p>
            Cifras del {from}: {daily.count} turnos · ${money(daily.facturado)}{' '}
            · ocupación {daily.occupancyPercent}%
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
                <td align="right">${money(row.facturado)}</td>
                <td align="right">${money(row.aPagar)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td>
                <strong>Total</strong>
              </td>
              <td align="center">
                <strong>{totals.turnos}</strong>
              </td>
              <td align="right">
                <strong>${money(totals.facturado)}</strong>
              </td>
              <td align="right">
                <strong>${money(totals.aPagar)}</strong>
              </td>
            </tr>
          </tfoot>
        </table>
      </section>
    </AppShell>
  );
}
