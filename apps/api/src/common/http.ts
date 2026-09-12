import { NotFoundException } from '@nestjs/common';

export function hiddenNotFound(): never {
  throw new NotFoundException('No encontrado');
}

export function money(value: { toNumber?: () => number } | number | string): number {
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string') {
    return Number(value);
  }
  return value.toNumber ? value.toNumber() : Number(value);
}
