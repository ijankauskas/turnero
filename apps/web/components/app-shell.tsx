'use client';

import { CSSProperties, ReactNode, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ROLE_LABEL } from '../lib/labels';
import {
  apiFetch,
  clearSession,
  readSession,
} from '../lib/session';
import { isLightColor, normalizeHex } from '../lib/brand';
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
  const [menuOpen, setMenuOpen] = useState(false);

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

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

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

  const accent = normalizeHex(me.company.primaryColor, '#2563eb');
  const menuBg = normalizeHex(me.company.secondaryColor, '#0b1220');
  const menuLight = isLightColor(menuBg);
  const links = NAV.filter(
    (item) => !item.roles || item.roles.includes(me.user.role),
  );

  function logout() {
    const refresh = readSession()?.refreshToken;
    if (refresh) {
      void apiFetch('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken: refresh }),
      });
    }
    clearSession();
    router.replace('/login');
  }

  const nav = (
    <>
      <div className="flex items-center gap-2.5 px-4 py-5">
        {me.company.logoUrl ? (
          <img
            src={me.company.logoUrl}
            alt=""
            className="h-8 max-w-[88px] rounded object-contain"
          />
        ) : (
          <span
            className="grid size-8 place-items-center rounded-lg text-sm font-bold text-white"
            style={{ background: accent }}
          >
            {me.company.name.slice(0, 1)}
          </span>
        )}
        <strong
          className={cn(
            'truncate text-[15px] font-semibold',
            menuLight ? 'text-ink' : 'text-white',
          )}
        >
          {me.company.name}
        </strong>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 px-2">
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
                'rounded-lg px-3 py-2 text-sm font-medium transition',
                menuLight
                  ? 'text-ink/70 hover:bg-black/5 hover:text-ink'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white',
                current && (menuLight ? 'bg-black/5 text-ink' : 'bg-white/10 text-white'),
              )}
              style={
                current
                  ? { boxShadow: `inset 3px 0 0 ${accent}` }
                  : undefined
              }
            >
              {item.label}
            </a>
          );
        })}
      </nav>
      <div
        className={cn(
          'mt-auto border-t px-4 py-4',
          menuLight ? 'border-black/10' : 'border-white/10',
        )}
      >
        <p
          className={cn(
            'truncate text-sm font-medium',
            menuLight ? 'text-ink' : 'text-white',
          )}
        >
          {me.user.firstName} {me.user.lastName}
        </p>
        <p
          className={cn(
            'truncate text-xs',
            menuLight ? 'text-muted' : 'text-slate-400',
          )}
        >
          {ROLE_LABEL[me.user.role] ?? me.user.role}
        </p>
        <button
          type="button"
          onClick={logout}
          className={cn(
            'mt-3 w-full rounded-lg border px-3 py-1.5 text-sm transition',
            menuLight
              ? 'border-line text-ink hover:bg-black/5'
              : 'border-white/15 text-slate-200 hover:bg-white/10',
          )}
        >
          Salir
        </button>
      </div>
    </>
  );

  return (
    <div
      className="shell bg-canvas"
      style={
        {
          ['--color-accent' as string]: accent,
          ['--color-gold' as string]: accent,
          ['--color-sidebar' as string]: menuBg,
        } as CSSProperties
      }
    >
      {menuOpen ? (
        <button
          type="button"
          aria-label="Cerrar menú"
          className="fixed inset-0 z-30 bg-ink/40 lg:hidden"
          onClick={() => setMenuOpen(false)}
        />
      ) : null}
      <aside
        className={cn(
          'shell-nav flex min-h-screen flex-col bg-sidebar',
          menuLight ? 'text-ink' : 'text-white',
          menuOpen && 'is-open',
        )}
      >
        {nav}
      </aside>
      <div className="min-w-0">
        <div className="flex items-center gap-3 border-b border-line bg-paper px-4 py-3 lg:hidden">
          <button
            type="button"
            className="rounded-lg border border-line px-2.5 py-1.5 text-sm"
            onClick={() => setMenuOpen(true)}
          >
            Menú
          </button>
          <strong className="truncate text-sm">{me.company.name}</strong>
        </div>
        {children}
      </div>
    </div>
  );
}
