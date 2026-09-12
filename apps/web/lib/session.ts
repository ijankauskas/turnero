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

let refreshInFlight: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  if (refreshInFlight) {
    return refreshInFlight;
  }
  refreshInFlight = (async () => {
    const session = readSession();
    if (!session?.refreshToken) {
      return false;
    }
    const response = await fetch(`${apiBase}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: session.refreshToken }),
    });
    if (!response.ok) {
      clearSession();
      return false;
    }
    const body = (await response.json()) as SessionTokens;
    if (!body.accessToken || !body.refreshToken) {
      clearSession();
      return false;
    }
    writeSession(body);
    return true;
  })();
  try {
    return await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
}

export async function apiFetch(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  const session = readSession();
  if (session?.accessToken) {
    headers.set('Authorization', `Bearer ${session.accessToken}`);
  }
  const response = await fetch(`${apiBase}${path}`, { ...init, headers });
  const isAuth = path.startsWith('/auth/');
  if (response.status !== 401 || isAuth) {
    return response;
  }
  const refreshed = await refreshSession();
  if (!refreshed) {
    return response;
  }
  const retryHeaders = new Headers(init.headers);
  retryHeaders.set('Content-Type', 'application/json');
  const next = readSession();
  if (next?.accessToken) {
    retryHeaders.set('Authorization', `Bearer ${next.accessToken}`);
  }
  return fetch(`${apiBase}${path}`, { ...init, headers: retryHeaders });
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

/** Subida multipart (no fuerza Content-Type JSON). */
export async function apiUpload<T = { url: string; path: string }>(
  path: string,
  file: File,
): Promise<T> {
  async function send(token?: string) {
    const headers = new Headers();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    const body = new FormData();
    body.append('file', file);
    return fetch(`${apiBase}${path}`, { method: 'POST', headers, body });
  }

  let response = await send(readSession()?.accessToken);
  if (response.status === 401) {
    const refreshed = await refreshSession();
    if (refreshed) {
      response = await send(readSession()?.accessToken);
    }
  }
  const body = (await response.json()) as T & {
    message?: string | string[];
  };
  if (!response.ok) {
    const message = Array.isArray(body.message)
      ? body.message[0]
      : body.message;
    throw new Error(message || 'Error al subir archivo');
  }
  return body;
}
