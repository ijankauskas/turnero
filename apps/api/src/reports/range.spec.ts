import { parseReportRange } from './range';

describe('parseReportRange', () => {
  it('treats civil dates as inclusive days in the company timezone', () => {
    const range = parseReportRange(
      '2026-09-01',
      '2026-09-09',
      'America/Argentina/Buenos_Aires',
    );
    expect(range.start.toISOString()).toBe('2026-09-01T03:00:00.000Z');
    expect(range.end.toISOString()).toBe('2026-09-10T03:00:00.000Z');
  });
});
