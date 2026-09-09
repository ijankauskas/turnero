'use client';

import { monthCells, monthStart } from '../../lib/datetime';
import type { Appointment } from './types';
import { VISIBLE_STATUSES } from './types';
import { cardClass, cn } from '../ui';

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
    <div className={cn(cardClass, 'p-4')}>
      <h2 className="mt-0 mb-4 font-serif text-2xl capitalize">{title}</h2>
      <div className="grid grid-cols-7 gap-2">
        {WEEKDAYS.map((day) => (
          <div key={day} className="px-1 text-xs text-muted">
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
              className={cn(
                'min-h-[88px] rounded-xl border p-2 text-left transition hover:border-ink/30',
                cell.date === date
                  ? 'border-ink bg-cream'
                  : 'border-line',
                cell.inMonth ? 'bg-paper text-ink' : 'bg-cream/50 text-muted',
              )}
            >
              <div className="font-semibold">
                {Number(cell.date.slice(8, 10))}
              </div>
              {count ? (
                <div className="mt-2 text-xs text-muted">
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
