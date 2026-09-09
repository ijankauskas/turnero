'use client';

import { FormEvent, useEffect, useState } from 'react';
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
type Branch = { id: string; name: string };

const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export default function ConfigProfesionalesPage() {
  const [rows, setRows] = useState<Professional[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [schedule, setSchedule] = useState<Block[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void Promise.all([
      apiJson<Professional[]>('/professionals'),
      apiJson<Branch[]>('/branches'),
    ])
      .then(([pros, b]) => {
        setRows(pros);
        setBranches(b);
      })
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

  function addBlock() {
    setSchedule((current) => [
      ...current,
      {
        weekday: 0,
        branchId: branches[0]?.id ?? '',
        startTime: '09:00',
        endTime: '18:00',
        isOff: false,
      },
    ]);
  }

  function updateBlock(index: number, patch: Partial<Block>) {
    setSchedule((current) =>
      current.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  }

  async function onSave(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      const saved = await apiJson<Block[]>(`/professionals/${selected}/schedule`, {
        method: 'PUT',
        body: JSON.stringify({
          blocks: schedule.map((row) => ({
            weekday: Number(row.weekday),
            branchId: row.branchId,
            startTime: row.startTime,
            endTime: row.endTime,
            isOff: row.isOff,
          })),
        }),
      });
      setSchedule(saved);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const current = rows.find((row) => row.id === selected);

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
        {selected && current ? (
          <form onSubmit={onSave}>
            <h2>Horario semanal de {current.displayName}</h2>
            <p style={{ fontSize: 13, color: '#666' }}>
              Un profesional no puede tener dos sucursales el mismo día a la
              misma hora.
            </p>
            {schedule.map((block, index) => (
              <div
                key={`${block.weekday}-${index}`}
                style={{
                  display: 'flex',
                  gap: 8,
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  marginBottom: 8,
                }}
              >
                <select
                  value={block.weekday}
                  onChange={(e) =>
                    updateBlock(index, { weekday: Number(e.target.value) })
                  }
                >
                  {DAYS.map((day, weekday) => (
                    <option key={day} value={weekday}>
                      {day}
                    </option>
                  ))}
                </select>
                <select
                  value={block.branchId}
                  onChange={(e) =>
                    updateBlock(index, { branchId: e.target.value })
                  }
                >
                  {branches.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.name}
                    </option>
                  ))}
                </select>
                <input
                  type="time"
                  value={block.startTime}
                  onChange={(e) =>
                    updateBlock(index, { startTime: e.target.value })
                  }
                />
                <input
                  type="time"
                  value={block.endTime}
                  onChange={(e) =>
                    updateBlock(index, { endTime: e.target.value })
                  }
                />
                <label>
                  <input
                    type="checkbox"
                    checked={block.isOff}
                    onChange={(e) =>
                      updateBlock(index, { isOff: e.target.checked })
                    }
                  />{' '}
                  Franco
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setSchedule((current) =>
                      current.filter((_, i) => i !== index),
                    )
                  }
                >
                  Quitar
                </button>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={addBlock}>
                Agregar bloque
              </button>
              <button type="submit" disabled={saving}>
                Guardar horario
              </button>
            </div>
          </form>
        ) : null}
      </section>
    </AppShell>
  );
}
