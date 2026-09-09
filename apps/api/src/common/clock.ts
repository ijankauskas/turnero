const WEEKDAY_SHORT: Record<string, number> = {
  Mon: 0,
  Tue: 1,
  Wed: 2,
  Thu: 3,
  Fri: 4,
  Sat: 5,
  Sun: 6,
};

export function clockToMinutes(hhmm: string): number {
  const [hours, minutes] = hhmm.split(':').map(Number);
  return hours * 60 + minutes;
}

export function minutesToClock(total: number): string {
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function dateToClock(value: Date): string {
  return `${String(value.getUTCHours()).padStart(2, '0')}:${String(
    value.getUTCMinutes(),
  ).padStart(2, '0')}`;
}

export function clockToDate(hhmm: string): Date {
  const [hours, minutes] = hhmm.split(':').map(Number);
  return new Date(Date.UTC(1970, 0, 1, hours, minutes, 0));
}

export function intervalsOverlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

function zonedParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    weekday: 'short',
    hourCycle: 'h23',
  }).formatToParts(date);
  const map: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== 'literal') {
      map[part.type] = part.value;
    }
  }
  return map;
}

export function weekdayIsoInZone(date: Date, timeZone: string): number {
  const parts = zonedParts(date, timeZone);
  return WEEKDAY_SHORT[parts.weekday] ?? 0;
}

export function minutesOfDayInZone(date: Date, timeZone: string): number {
  const parts = zonedParts(date, timeZone);
  return Number(parts.hour) * 60 + Number(parts.minute);
}

export function dateInZone(date: Date, timeZone: string): string {
  const parts = zonedParts(date, timeZone);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function addDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day + days));
  return utc.toISOString().slice(0, 10);
}

export function zonedLocalToUtc(
  isoDate: string,
  hhmm: string,
  timeZone: string,
): Date {
  const [year, month, day] = isoDate.split('-').map(Number);
  const [hour, minute] = hhmm.split(':').map(Number);
  const guess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  const parts = zonedParts(guess, timeZone);
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return new Date(guess.getTime() - (asUtc - guess.getTime()));
}

export function dayRangeUtc(isoDate: string, timeZone: string): {
  from: Date;
  to: Date;
} {
  return {
    from: zonedLocalToUtc(isoDate, '00:00', timeZone),
    to: zonedLocalToUtc(addDays(isoDate, 1), '00:00', timeZone),
  };
}
