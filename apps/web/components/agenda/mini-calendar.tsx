'use client';

import { monthCells, monthStart, nextMonthStart, addDays } from '../../lib/datetime';

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
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 8,
        }}
      >
        <button
          type="button"
          onClick={() => onSelect(addDays(start, -1))}
          aria-label="Mes anterior"
        >
          ‹
        </button>
        <strong style={{ fontSize: 13, textTransform: 'capitalize' }}>
          {monthName}
        </strong>
        <button
          type="button"
          onClick={() => onSelect(nextMonthStart(date))}
          aria-label="Mes siguiente"
        >
          ›
        </button>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 2,
          fontSize: 11,
          textAlign: 'center',
        }}
      >
        {WEEKDAYS.map((day, i) => (
          <div key={`${day}-${i}`} style={{ color: '#888' }}>
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
              style={{
                border: 0,
                borderRadius: 6,
                padding: '6px 0',
                background: selected ? 'var(--color-primary, #1a1a1a)' : 'transparent',
                color: selected
                  ? '#fff'
                  : cell.inMonth
                    ? '#1a1a1a'
                    : '#bbb',
                fontWeight: has ? 700 : 400,
                cursor: 'pointer',
              }}
            >
              {Number(cell.date.slice(8, 10))}
              {has && !selected ? (
                <div
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: 4,
                    background: 'var(--color-primary, #1a1a1a)',
                    margin: '2px auto 0',
                  }}
                />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
