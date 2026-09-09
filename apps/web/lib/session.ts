export type SessionTokens = {
  accessToken: string;
  refreshToken: string;
};

const ACCESS_KEY = 'turnero.accessToken';
const REFRESH_KEY = 'turnero.refreshToken';

export function readSession(): SessionTokens | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const accessToken = localStorage.getItem(ACCESS_KEY);
  const refreshToken = localStorage.getItem(REFRESH_KEY);
  if (!accessToken || !refreshToken) {
    return null;
  }
  return { accessToken, refreshToken };
}

export function writeSession(tokens: SessionTokens) {
  localStorage.setItem(ACCESS_KEY, tokens.accessToken);
  localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
}

export function clearSession() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export const apiBase =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

export async function apiFetch(path: string, init: RequestInit = {}) {
  const session = readSession();
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  if (session?.accessToken) {
    headers.set('Authorization', `Bearer ${session.accessToken}`);
  }
  return fetch(`${apiBase}${path}`, { ...init, headers });
}

export async function apiJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await apiFetch(path, init);
  const body = (await response.json()) as T & {
    message?: string | string[];
    error?: string;
    matches?: unknown;
  };
  if (!response.ok) {
    const message = Array.isArray(body.message)
      ? body.message[0]
      : body.message;
    const error = new Error(message || 'Error de API') as Error & {
      status: number;
      body: unknown;
    };
    error.status = response.status;
    error.body = body;
    throw error;
  }
  return body;
}
