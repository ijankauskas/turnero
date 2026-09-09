import { occupancyPercent } from './occupancy';

describe('occupancyPercent', () => {
  it('is occupied / scheduled rounded to one decimal', () => {
    expect(occupancyPercent(45, 540)).toBe(8.3);
    expect(occupancyPercent(0, 540)).toBe(0);
    expect(occupancyPercent(100, 0)).toBe(0);
  });
});
