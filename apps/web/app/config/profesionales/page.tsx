'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '../../../components/app-shell';
import { apiJson } from '../../../lib/session';

type Professional = {
  id: string;
  displayName: string;
  color: string;
  branches: Array<{ id: string; name: string }>;
};
type Block = {
  weekday: number;
  branchId: string;
  startTime: string;
  endTime: string;
  isOff: boolean;
};

const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export default function ConfigProfesionalesPage() {
  const [rows, setRows] = useState<Professional[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [schedule, setSchedule] = useState<Block[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void apiJson<Professional[]>('/professionals')
      .then(setRows)
      .catch((err: Error) => setError(err.message));
  }, []);

  async function openSchedule(id: string) {
    setSelected(id);
    try {
      setSchedule(await apiJson<Block[]>(`/professionals/${id}/schedule`));
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <AppShell>
      <section style={{ padding: '1.25rem' }}>
        <h1>Profesionales</h1>
        {error ? <p role="alert">{error}</p> : null}
        <ul>
          {rows.map((row) => (
            <li key={row.id}>
              <button type="button" onClick={() => void openSchedule(row.id)}>
                {row.displayName}
              </button>{' '}
              · {row.branches.map((b) => b.name).join(', ') || 'sin sucursal'}
            </li>
          ))}
        </ul>
        {selected ? (
          <>
            <h2>Horario semanal</h2>
            <ul>
              {schedule.map((block) => (
                <li key={`${block.weekday}-${block.startTime}`}>
                  {DAYS[block.weekday]} {block.startTime}–{block.endTime}
                  {block.isOff ? ' (franco)' : ''}
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </section>
    </AppShell>
  );
}
