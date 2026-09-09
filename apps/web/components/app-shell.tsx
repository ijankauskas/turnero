'use client';

import { ReactNode, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ROLE_LABEL } from '../lib/labels';
import {
  apiFetch,
  clearSession,
  readSession,
} from '../lib/session';
import { cn } from './ui';

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

const NAV = [
  { href: '/agenda', label: 'Agenda', roles: null as string[] | null },
  {
    href: '/clientes',
    label: 'Clientes',
    roles: ['ADMINISTRADOR', 'ENCARGADO', 'RECEPCION'],
  },
  {
    href: '/prestaciones',
    label: 'Prestaciones',
    roles: ['ADMINISTRADOR', 'ENCARGADO', 'RECEPCION'],
  },
  {
    href: '/reportes',
    label: 'Reportes',
    roles: ['ADMINISTRADOR', 'ENCARGADO'],
  },
  { href: '/config', label: 'Configuración', roles: ['ADMINISTRADOR'] },
];

export function AppShell({
  children,
  allow,
}: {
  children: ReactNode;
  allow?: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
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

  const forbidden = Boolean(me && allow && !allow.includes(me.user.role));

  useEffect(() => {
    if (forbidden) {
      router.replace('/agenda');
    }
  }, [forbidden, router]);

  if (!me || forbidden) {
    return (
      <p className="px-6 py-16 text-center text-sm text-muted">Cargando…</p>
    );
  }

  const accent = me.company.primaryColor ?? '#2c241c';
  const links = NAV.filter(
    (item) => !item.roles || item.roles.includes(me.user.role),
  );

  return (
    <div
      className="min-h-screen"
      style={{
        background: me.company.secondaryColor ?? '#f6f4f1',
        ['--color-primary' as string]: accent,
      }}
    >
      <header className="app-header sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-line/80 bg-paper/90 px-5 py-3 backdrop-blur md:px-8">
        <span className="flex min-w-0 items-center gap-3">
          {me.company.logoUrl ? (
            <img
              src={me.company.logoUrl}
              alt={me.company.name}
              className="h-8 max-w-[120px] object-contain"
            />
          ) : null}
          <strong className="truncate font-serif text-xl font-semibold tracking-tight">
            {me.company.name}
          </strong>
        </span>
        <nav className="flex flex-wrap items-center gap-1 text-sm text-muted">
          {links.map((item) => {
            const current =
              item.href === '/agenda'
                ? pathname === '/agenda'
                : pathname.startsWith(item.href);
            return (
              <a
                key={item.href}
                href={item.href}
                aria-current={current ? 'page' : undefined}
                className={cn(
                  'rounded-full px-3 py-1.5 transition hover:bg-cream hover:text-ink',
                  current && 'bg-cream text-ink',
                )}
              >
                {item.label}
              </a>
            );
          })}
        </nav>
        <span className="flex items-center gap-3 text-[13px] text-muted">
          <span className="hidden sm:inline">
            {me.user.firstName} {me.user.lastName} ·{' '}
            {ROLE_LABEL[me.user.role] ?? me.user.role}
          </span>
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
            className="rounded-full border border-line bg-white px-3 py-1.5 text-ink transition hover:bg-cream"
          >
            Salir
          </button>
        </span>
      </header>
      {children}
    </div>
  );
}
