import {
  zonedLocalToUtc,
  weekdayIsoInZone,
  intervalsOverlap,
  startOfIsoWeek,
  monthStart,
  nextMonthStart,
} from './clock';
import { assertScheduleNoCrossBranchOverlap } from './schedule-rules';

describe('clock', () => {
  it('converts Buenos Aires wall time to UTC', () => {
    const utc = zonedLocalToUtc(
      '2026-09-09',
      '10:00',
      'America/Argentina/Buenos_Aires',
    );
    expect(utc.toISOString()).toBe('2026-09-09T13:00:00.000Z');
    expect(weekdayIsoInZone(utc, 'America/Argentina/Buenos_Aires')).toBe(2);
  });

  it('detects overlapping intervals', () => {
    expect(intervalsOverlap(9 * 60, 12 * 60, 11 * 60, 13 * 60)).toBe(true);
    expect(intervalsOverlap(9 * 60, 12 * 60, 12 * 60, 14 * 60)).toBe(false);
  });

  it('resolves ISO week and month bounds from a civil date', () => {
    expect(startOfIsoWeek('2026-09-09')).toBe('2026-09-07');
    expect(monthStart('2026-09-09')).toBe('2026-09-01');
    expect(nextMonthStart('2026-09-09')).toBe('2026-10-01');
  });
});

describe('schedule rules', () => {
  it('rejects the same weekday in two branches at once', () => {
    const result = assertScheduleNoCrossBranchOverlap([
      {
        weekday: 2,
        branchId: 'centro',
        startTime: '09:00',
        endTime: '18:00',
        isOff: false,
      },
      {
        weekday: 2,
        branchId: 'norte',
        startTime: '09:00',
        endTime: '18:00',
        isOff: false,
      },
    ]);
    expect(result.ok).toBe(false);
  });
});
