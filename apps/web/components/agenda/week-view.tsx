'use client';

import { addDays, startOfIsoWeek } from '../../lib/datetime';
import type { Appointment, Professional } from './types';
import { VISIBLE_STATUSES } from './types';

const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

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

export function WeekView({
  date,
  timeZone,
  professionals,
  appointments,
  canCreate,
  onSelect,
  onCreateSlot,
  onOpenDay,
}: {
  date: string;
  timeZone: string;
  professionals: Professional[];
  appointments: Appointment[];
  canCreate: boolean;
  onSelect: (item: Appointment) => void;
  onCreateSlot: (professionalId: string, day: string) => void;
  onOpenDay: (day: string) => void;
}) {
  const start = startOfIsoWeek(date);
  const days = DAYS.map((label, i) => ({
    label,
    iso: addDays(start, i),
  }));

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `140px repeat(7, minmax(90px, 1fr))`,
        background: '#fff',
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      <div />
      {days.map((day) => (
        <button
          key={day.iso}
          type="button"
          onClick={() => onOpenDay(day.iso)}
          style={{
            border: 0,
            background: day.iso === date ? '#f3eee8' : '#fff',
            padding: 8,
            fontWeight: 600,
            cursor: 'pointer',
            borderLeft: '1px solid #eee',
          }}
        >
          {day.label}
          <div style={{ fontWeight: 400, fontSize: 12 }}>
            {day.iso.slice(8, 10)}
          </div>
        </button>
      ))}
      {professionals.map((pro) => [
        <div
          key={`${pro.id}-name`}
          style={{
            padding: 8,
            fontWeight: 600,
            color: pro.color,
            borderTop: '1px solid #f0f0f0',
          }}
        >
          {pro.displayName}
        </div>,
        ...days.map((day) => {
          const ofDay = appointments.filter(
            (item) =>
              item.professionalId === pro.id &&
              VISIBLE_STATUSES.has(item.status) &&
              dateInCompany(item.startAt, timeZone) === day.iso,
          );
          return (
            <div
              key={`${pro.id}-${day.iso}`}
              onClick={() =>
                canCreate ? onCreateSlot(pro.id, day.iso) : onOpenDay(day.iso)
              }
              style={{
                minHeight: 72,
                borderTop: '1px solid #f0f0f0',
                borderLeft: '1px solid #f0f0f0',
                padding: 4,
                cursor: 'pointer',
                background: day.iso === date ? '#faf7f3' : '#fff',
              }}
            >
              {ofDay.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelect(item);
                  }}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    border: 0,
                    background: pro.color,
                    color: '#fff',
                    borderRadius: 6,
                    padding: '4px 6px',
                    fontSize: 11,
                    marginBottom: 4,
                    cursor: 'pointer',
                  }}
                >
                  {item.serviceNameSnapshot}
                </button>
              ))}
            </div>
          );
        }),
      ])}
    </div>
  );
}
