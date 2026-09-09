import { dayRangeUtc } from '../common/clock';

const CIVIL = /^\d{4}-\d{2}-\d{2}$/;

export function parseReportRange(
  from: string,
  to: string,
  timeZone: string,
): { start: Date; end: Date } {
  if (CIVIL.test(from) && CIVIL.test(to)) {
    return {
      start: dayRangeUtc(from, timeZone).from,
      end: dayRangeUtc(to, timeZone).to,
    };
  }
  return { start: new Date(from), end: new Date(to) };
}
