import { clockToMinutes, dateToClock, intervalsOverlap } from './clock';

export type ScheduleBlock = {
  weekday: number;
  branchId: string;
  startTime: Date | string;
  endTime: Date | string;
  isOff: boolean;
};

function blockMinutes(block: ScheduleBlock) {
  const start =
    typeof block.startTime === 'string'
      ? clockToMinutes(block.startTime)
      : clockToMinutes(dateToClock(block.startTime));
  const end =
    typeof block.endTime === 'string'
      ? clockToMinutes(block.endTime)
      : clockToMinutes(dateToClock(block.endTime));
  return { start, end };
}

export function assertScheduleNoCrossBranchOverlap(
  blocks: ScheduleBlock[],
): { ok: true } | { ok: false; message: string } {
  for (let i = 0; i < blocks.length; i += 1) {
    for (let j = i + 1; j < blocks.length; j += 1) {
      const a = blocks[i];
      const b = blocks[j];
      if (a.weekday !== b.weekday || a.isOff || b.isOff) {
        continue;
      }
      const am = blockMinutes(a);
      const bm = blockMinutes(b);
      if (!intervalsOverlap(am.start, am.end, bm.start, bm.end)) {
        continue;
      }
      if (a.branchId !== b.branchId) {
        return {
          ok: false,
          message:
            'El profesional no puede tener horario solapado en dos sucursales el mismo día',
        };
      }
      return {
        ok: false,
        message: 'Los bloques del mismo día en una sucursal no pueden solaparse',
      };
    }
  }
  return { ok: true };
}

export function fitsScheduleBlock(
  weekday: number,
  branchId: string,
  startMinutes: number,
  endMinutes: number,
  blocks: ScheduleBlock[],
): boolean {
  return blocks.some((block) => {
    if (block.isOff || block.weekday !== weekday || block.branchId !== branchId) {
      return false;
    }
    const { start, end } = blockMinutes(block);
    return startMinutes >= start && endMinutes <= end;
  });
}
