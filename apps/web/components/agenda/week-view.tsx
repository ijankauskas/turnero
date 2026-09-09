'use client';

import { addDays, startOfIsoWeek } from '../../lib/datetime';
import type { Appointment, Professional } from './types';
import { VISIBLE_STATUSES } from './types';
import { apptSurface, cardClass, cn } from '../ui';

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
      className={cn(cardClass, 'overflow-hidden')}
      style={{
        display: 'grid',
        gridTemplateColumns: `140px repeat(7, minmax(90px, 1fr))`,
      }}
    >
      <div />
      {days.map((day) => (
        <button
          key={day.iso}
          type="button"
          onClick={() => onOpenDay(day.iso)}
          className={cn(
            'border-l border-line px-2 py-3 text-sm font-semibold',
            day.iso === date ? 'bg-cream' : 'bg-paper',
          )}
        >
          {day.label}
          <div className="text-xs font-normal text-muted">
            {day.iso.slice(8, 10)}
          </div>
        </button>
      ))}
      {professionals.map((pro) => [
        <div
          key={`${pro.id}-name`}
          className="border-t border-line px-3 py-2 text-sm font-semibold"
          style={{ color: pro.color }}
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
              className={cn(
                'min-h-[72px] cursor-pointer border-t border-l border-line p-1',
                day.iso === date ? 'bg-cream/60' : 'bg-paper',
              )}
            >
              {ofDay.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelect(item);
                  }}
                  className="mb-1 block w-full rounded-lg px-2 py-1 text-left text-[11px]"
                  style={apptSurface(pro.color)}
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
