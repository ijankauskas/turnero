export const MAX_EMAIL_ATTEMPTS = 3;

export function bumpEmailRetry(payload: unknown): {
  retries: number;
  giveUp: boolean;
  payload: Record<string, unknown>;
} {
  const base =
    payload && typeof payload === 'object' && !Array.isArray(payload)
      ? { ...(payload as Record<string, unknown>) }
      : {};
  const retries = (typeof base.retries === 'number' ? base.retries : 0) + 1;
  return {
    retries,
    giveUp: retries >= MAX_EMAIL_ATTEMPTS,
    payload: { ...base, retries },
  };
}
