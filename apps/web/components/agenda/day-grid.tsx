'use client';

import { MouseEvent } from 'react';
import {
  minutesOfDayInZone,
  minutesToClock,
} from '../../lib/datetime';
import type { Appointment, Professional } from './types';
import { VISIBLE_STATUSES } from './types';

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
      style={{
        display: 'grid',
        gridTemplateColumns: `64px repeat(${Math.max(columns.length, 1)}, minmax(150px, 1fr))`,
        background: '#fff',
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      <div />
      {columns.map((pro) => (
        <div
          key={pro.id}
          style={{
            padding: 8,
            textAlign: 'center',
            fontWeight: 600,
            borderLeft: '1px solid #eee',
            color: pro.color,
          }}
        >
          {pro.displayName}
        </div>
      ))}
      <div style={{ position: 'relative', height }}>
        {Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: i * 60 * PX_PER_MINUTE,
              fontSize: 11,
              color: '#888',
            }}
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
            style={{
              position: 'relative',
              height,
              borderLeft: '1px solid #f0f0f0',
              backgroundImage:
                'repeating-linear-gradient(to bottom, transparent 0, transparent 14px, #f7f7f7 15px)',
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
                    style={{
                      position: 'absolute',
                      left: 6,
                      right: 6,
                      top: Math.max(minutes, 0) * PX_PER_MINUTE,
                      height: item.durationMinutes * PX_PER_MINUTE,
                      background: pro.color,
                      color: '#fff',
                      borderRadius: 8,
                      padding: 6,
                      fontSize: 12,
                      overflow: 'hidden',
                      cursor: 'pointer',
                      opacity: item.status === 'NO_ASISTIO' ? 0.55 : 1,
                    }}
                  >
                    <strong>{item.serviceNameSnapshot}</strong>
                    <div>
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
