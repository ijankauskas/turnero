'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  apiFetch,
  clearSession,
  readSession,
} from '../lib/session';

type MeResponse = {
  user: {
    firstName: string;
    lastName: string;
    role: string;
    email: string;
  };
  company: {
    name: string;
    primaryColor: string | null;
    secondaryColor: string | null;
    logoUrl: string | null;
  };
};

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [me, setMe] = useState<MeResponse | null>(null);

  useEffect(() => {
    if (!readSession()) {
      router.replace('/login');
      return;
    }
    void apiFetch('/auth/me')
      .then(async (response) => {
        if (!response.ok) {
          clearSession();
          router.replace('/login');
          return;
        }
        setMe((await response.json()) as MeResponse);
      })
      .catch(() => {
        router.replace('/login');
      });
  }, [router]);

  if (!me) {
    return (
      <p style={{ padding: '2rem', textAlign: 'center' }}>Cargando…</p>
    );
  }

  const accent = me.company.primaryColor ?? '#1a1a1a';
  const canSeeReports =
    me.user.role === 'ADMINISTRADOR' || me.user.role === 'ENCARGADO';
  const canSeeConfig = me.user.role === 'ADMINISTRADOR';
  const isProfessional = me.user.role === 'PROFESIONAL';

  return (
    <div
      style={{
        minHeight: '100vh',
        background: me.company.secondaryColor ?? '#f6f4f1',
        ['--color-primary' as string]: accent,
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 20px',
          background: '#fff',
          borderBottom: `3px solid ${accent}`,
        }}
      >
        <strong>{me.company.name}</strong>
        <nav style={{ display: 'flex', gap: 16, fontSize: 14 }}>
          <a href="/agenda">Agenda</a>
          {!isProfessional ? <a href="/clientes">Clientes</a> : null}
          {!isProfessional ? <a href="/prestaciones">Prestaciones</a> : null}
          {canSeeReports ? <a href="/reportes">Reportes</a> : null}
          {canSeeConfig ? <a href="/config">Configuración</a> : null}
        </nav>
        <span style={{ fontSize: 13 }}>
          {me.user.firstName} {me.user.lastName} · {me.user.role}
          {' · '}
          <button
            type="button"
            onClick={() => {
              const refresh = readSession()?.refreshToken;
              if (refresh) {
                void apiFetch('/auth/logout', {
                  method: 'POST',
                  body: JSON.stringify({ refreshToken: refresh }),
                });
              }
              clearSession();
              router.replace('/login');
            }}
            style={{
              border: 0,
              background: 'transparent',
              textDecoration: 'underline',
              cursor: 'pointer',
            }}
          >
            Salir
          </button>
        </span>
      </header>
      {children}
    </div>
  );
}
