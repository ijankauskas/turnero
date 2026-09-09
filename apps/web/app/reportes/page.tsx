'use client';

import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '../../components/app-shell';
import { monthEnd, monthStart, todayInZone } from '../../lib/datetime';
import { apiJson } from '../../lib/session';
import type { MeResponse } from '../../lib/types';
import {
  Alert,
  btnGhost,
  btnPrimary,
  cardClass,
  cn,
  controlClass,
  Page,
  PageTitle,
  tdClass,
  thClass,
} from '../../components/ui';

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
      <Page>
        <PageTitle kicker="Números">Reportes</PageTitle>
        <div className="mb-5 flex flex-wrap items-end gap-2">
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className={cn(controlClass, 'mt-0')}
          />
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className={cn(controlClass, 'mt-0')}
          />
          {role === 'ADMINISTRADOR' ? (
            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className={cn(controlClass, 'mt-0')}
            >
              <option value="">Todas</option>
              {branches.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                </option>
              ))}
            </select>
          ) : null}
          <button type="button" onClick={() => void load()} className={btnGhost}>
            Actualizar
          </button>
          <button
            type="button"
            onClick={downloadCsv}
            disabled={!items.length}
            className={btnPrimary}
          >
            Descargar CSV
          </button>
        </div>
        {error ? <Alert>{error}</Alert> : null}
        {daily ? (
          <p className="mb-4 text-sm text-muted">
            Cifras del {from}: {daily.count} turnos · ${money(daily.facturado)}{' '}
            · ocupación {daily.occupancyPercent}%
          </p>
        ) : null}
        <div className={cn(cardClass, 'overflow-hidden')}>
          <table className="w-full">
            <thead>
              <tr>
                <th className={thClass}>Persona</th>
                <th className={cn(thClass, 'text-center')}>Turnos</th>
                <th className={cn(thClass, 'text-right')}>Facturado</th>
                <th className={cn(thClass, 'text-right')}>A pagar</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td className={tdClass} colSpan={4}>
                    Sin turnos atendidos en el período.
                  </td>
                </tr>
              ) : null}
              {items.map((row) => (
                <tr key={row.professionalId} className="hover:bg-cream/60">
                  <td className={tdClass}>{row.name}</td>
                  <td className={cn(tdClass, 'text-center')}>{row.turnos}</td>
                  <td className={cn(tdClass, 'text-right')}>
                    ${money(row.facturado)}
                  </td>
                  <td className={cn(tdClass, 'text-right')}>
                    ${money(row.aPagar)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td className={tdClass}>
                  <strong>Total</strong>
                </td>
                <td className={cn(tdClass, 'text-center')}>
                  <strong>{totals.turnos}</strong>
                </td>
                <td className={cn(tdClass, 'text-right')}>
                  <strong>${money(totals.facturado)}</strong>
                </td>
                <td className={cn(tdClass, 'text-right')}>
                  <strong>${money(totals.aPagar)}</strong>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Page>
    </AppShell>
  );
}
