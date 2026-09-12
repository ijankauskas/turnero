export function addDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day + days));
  return utc.toISOString().slice(0, 10);
}

export function startOfIsoWeek(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  const weekday = (utc.getUTCDay() + 6) % 7;
  return addDays(isoDate, -weekday);
}

export function monthStart(isoDate: string): string {
  const [year, month] = isoDate.split('-').map(Number);
  return `${year}-${String(month).padStart(2, '0')}-01`;
}

export function nextMonthStart(isoDate: string): string {
  const [year, month] = isoDate.split('-').map(Number);
  if (month === 12) {
    return `${year + 1}-01-01`;
  }
  return `${year}-${String(month + 1).padStart(2, '0')}-01`;
}

export function monthEnd(isoDate: string): string {
  return addDays(nextMonthStart(isoDate), -1);
}

export function todayInZone(timeZone: string): string {
  return dateInZone(new Date(), timeZone);
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

export function dateInZone(date: Date, timeZone: string): string {
  const parts = zonedParts(date, timeZone);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function minutesOfDayInZone(iso: string, timeZone: string): number {
  const parts = zonedParts(new Date(iso), timeZone);
  return Number(parts.hour) * 60 + Number(parts.minute);
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

export function formatClock(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone,
  }).format(new Date(iso));
}

export function formatLongDate(isoDate: string, timeZone: string): string {
  const utc = zonedLocalToUtc(isoDate, '12:00', timeZone);
  return new Intl.DateTimeFormat('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone,
  }).format(utc);
}

export function formatLongInstant(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone,
  }).format(new Date(iso));
}

export function minutesToClock(total: number): string {
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function monthCells(isoDate: string): Array<{
  date: string;
  inMonth: boolean;
}> {
  const start = monthStart(isoDate);
  const end = nextMonthStart(isoDate);
  const gridStart = startOfIsoWeek(start);
  const cells: Array<{ date: string; inMonth: boolean }> = [];
  let cursor = gridStart;
  while (cells.length < 42) {
    cells.push({ date: cursor, inMonth: cursor >= start && cursor < end });
    cursor = addDays(cursor, 1);
  }
  return cells;
}
