'use client';

import { MouseEvent } from 'react';
import {
  minutesOfDayInZone,
  minutesToClock,
} from '../../lib/datetime';
import type { Appointment, Professional } from './types';
import { VISIBLE_STATUSES } from './types';
import { apptSurface, cardClass, cn } from '../ui';

const START_HOUR = 9;
const END_HOUR = 19;
export const PX_PER_MINUTE = 1.2;

export function DayGrid({
  professionals,
  appointments,
  timeZone,
  canCreate,
  onSelect,
  onCreateSlot,
}: {
  professionals: Professional[];
  appointments: Appointment[];
  timeZone: string;
  canCreate: boolean;
  onSelect: (item: Appointment) => void;
  onCreateSlot: (professionalId: string, time: string) => void;
}) {
  const height = (END_HOUR - START_HOUR) * 60 * PX_PER_MINUTE;
  const columns = professionals.length ? professionals : [];

  function onColumnClick(
    event: MouseEvent<HTMLDivElement>,
    professionalId: string,
  ) {
    if (!canCreate) return;
    const target = event.target as HTMLElement;
    if (target.closest('[data-appointment]')) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const y = event.clientY - rect.top;
    const minutes =
      Math.round(y / PX_PER_MINUTE / 15) * 15 + START_HOUR * 60;
    const clamped = Math.min(Math.max(minutes, START_HOUR * 60), (END_HOUR - 1) * 60);
    onCreateSlot(professionalId, minutesToClock(clamped));
  }

  return (
    <div
      className={cn(cardClass, 'overflow-hidden')}
      style={{
        display: 'grid',
        gridTemplateColumns: `64px repeat(${Math.max(columns.length, 1)}, minmax(150px, 1fr))`,
      }}
    >
      <div />
      {columns.map((pro) => (
        <div
          key={pro.id}
          className="border-l border-line px-2 py-3 text-center text-sm font-semibold"
          style={{ color: pro.color }}
        >
          {pro.displayName}
        </div>
      ))}
      <div className="relative" style={{ height }}>
        {Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => (
          <div
            key={i}
            className="absolute text-[11px] text-muted"
            style={{ top: i * 60 * PX_PER_MINUTE }}
          >
            {String(START_HOUR + i).padStart(2, '0')}:00
          </div>
        ))}
      </div>
      {(columns.length ? columns : [{ id: 'empty', displayName: '', color: '#ccc' }]).map(
        (pro) => (
          <div
            key={pro.id}
            onClick={(event) =>
              pro.id !== 'empty' ? onColumnClick(event, pro.id) : undefined
            }
            className="relative border-l border-line/80"
            style={{
              height,
              backgroundImage:
                'repeating-linear-gradient(to bottom, transparent 0, transparent 14px, #f3eee8 15px)',
              cursor: canCreate ? 'pointer' : 'default',
            }}
          >
            {appointments
              .filter(
                (item) =>
                  item.professionalId === pro.id &&
                  VISIBLE_STATUSES.has(item.status),
              )
              .map((item) => {
                const minutes =
                  minutesOfDayInZone(item.startAt, timeZone) - START_HOUR * 60;
                return (
                  <article
                    key={item.id}
                    data-appointment
                    onClick={(event) => {
                      event.stopPropagation();
                      onSelect(item);
                    }}
                    className="absolute right-1.5 left-1.5 overflow-hidden rounded-xl px-2 py-1.5 text-xs shadow-sm"
                    style={{
                      top: Math.max(minutes, 0) * PX_PER_MINUTE,
                      height: item.durationMinutes * PX_PER_MINUTE,
                      opacity: item.status === 'NO_ASISTIO' ? 0.55 : 1,
                      cursor: 'pointer',
                      ...apptSurface(pro.color),
                    }}
                  >
                    <strong className="block leading-tight">
                      {item.serviceNameSnapshot}
                    </strong>
                    <div className="truncate opacity-80">
                      {item.client.firstName} {item.client.lastName}
                    </div>
                  </article>
                );
              })}
          </div>
        ),
      )}
    </div>
  );
}
