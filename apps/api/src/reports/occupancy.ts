export function occupancyPercent(
  occupiedMinutes: number,
  scheduledMinutes: number,
): number {
  if (scheduledMinutes <= 0) {
    return 0;
  }
  return Math.round((occupiedMinutes / scheduledMinutes) * 1000) / 10;
}
