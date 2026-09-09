'use client';

import { monthCells, monthStart } from '../../lib/datetime';
import type { Appointment } from './types';
import { VISIBLE_STATUSES } from './types';

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

function dateInCompany(iso: string, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(iso));
  const map: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== 'literal') map[part.type] = part.value;
  }
  return `${map.year}-${map.month}-${map.day}`;
}

export function MonthView({
  date,
  timeZone,
  appointments,
  onOpenDay,
}: {
  date: string;
  timeZone: string;
  appointments: Appointment[];
  onOpenDay: (day: string) => void;
}) {
  const counts = new Map<string, number>();
  for (const item of appointments) {
    if (!VISIBLE_STATUSES.has(item.status)) continue;
    const key = dateInCompany(item.startAt, timeZone);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const title = new Intl.DateTimeFormat('es-AR', {
    month: 'long',
    year: 'numeric',
    timeZone,
  }).format(new Date(`${monthStart(date)}T12:00:00`));

  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: 12 }}>
      <h2 style={{ margin: '0 0 12px', textTransform: 'capitalize' }}>{title}</h2>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 8,
        }}
      >
        {WEEKDAYS.map((day) => (
          <div key={day} style={{ fontSize: 12, color: '#888', padding: 4 }}>
            {day}
          </div>
        ))}
        {monthCells(date).map((cell) => {
          const count = counts.get(cell.date) ?? 0;
          return (
            <button
              key={cell.date}
              type="button"
              onClick={() => onOpenDay(cell.date)}
              style={{
                minHeight: 88,
                border: cell.date === date ? '2px solid var(--color-primary, #1a1a1a)' : '1px solid #eee',
                borderRadius: 10,
                background: cell.inMonth ? '#fff' : '#fafafa',
                textAlign: 'left',
                padding: 8,
                cursor: 'pointer',
                color: cell.inMonth ? '#1a1a1a' : '#bbb',
              }}
            >
              <div style={{ fontWeight: 600 }}>{Number(cell.date.slice(8, 10))}</div>
              {count ? (
                <div style={{ fontSize: 12, marginTop: 8 }}>
                  {count} turno{count === 1 ? '' : 's'}
                </div>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
