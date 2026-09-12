'use client';

import { monthCells, monthStart, nextMonthStart, addDays } from '../../lib/datetime';
import { btnSoft, cn } from '../ui';

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

export function MiniCalendar({
  date,
  timeZone,
  marked,
  onSelect,
}: {
  date: string;
  timeZone: string;
  marked: Set<string>;
  onSelect: (iso: string) => void;
}) {
  const start = monthStart(date);
  const monthName = new Intl.DateTimeFormat('es-AR', {
    month: 'long',
    year: 'numeric',
    timeZone,
  }).format(new Date(`${start}T12:00:00`));

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => onSelect(addDays(start, -1))}
          aria-label="Mes anterior"
          className={cn(btnSoft, 'size-8 px-0')}
        >
          ‹
        </button>
        <strong className="text-sm font-semibold capitalize">{monthName}</strong>
        <button
          type="button"
          onClick={() => onSelect(nextMonthStart(date))}
          aria-label="Mes siguiente"
          className={cn(btnSoft, 'size-8 px-0')}
        >
          ›
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center text-[11px]">
        {WEEKDAYS.map((day, i) => (
          <div key={`${day}-${i}`} className="py-1 text-muted">
            {day}
          </div>
        ))}
        {monthCells(date).map((cell) => {
          const selected = cell.date === date;
          const has = marked.has(cell.date);
          return (
            <button
              key={cell.date}
              type="button"
              onClick={() => onSelect(cell.date)}
              className={cn(
                'rounded-lg py-1.5',
                selected && 'bg-accent text-white',
                !selected && cell.inMonth && 'text-ink hover:bg-canvas',
                !selected && !cell.inMonth && 'text-muted/50',
                has && !selected && 'font-semibold',
              )}
            >
              {Number(cell.date.slice(8, 10))}
              {has && !selected ? (
                <div className="mx-auto mt-0.5 size-1 rounded-full bg-accent" />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
