export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

export function phonesMatch(a: string, b: string): boolean {
  const left = digitsOnly(a);
  const right = digitsOnly(b);
  if (!left || !right) {
    return false;
  }
  return left === right || left.endsWith(right) || right.endsWith(left);
}
