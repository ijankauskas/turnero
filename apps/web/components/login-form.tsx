'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiBase, writeSession } from '../lib/session';
import {
  Alert,
  btnGhost,
  btnPrimary,
  cn,
  inputClass,
  labelClass,
} from './ui';

type Branding = {
  name: string;
  slug: string;
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
};

type CompanyOption = { slug: string; name: string };

export function LoginForm({
  initialSlug,
  branding,
}: {
  initialSlug?: string;
  branding?: Branding | null;
}) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [slug, setSlug] = useState(initialSlug ?? '');
  const [error, setError] = useState<string | null>(null);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [pending, setPending] = useState(false);

  const accent = branding?.primaryColor ?? '#2563eb';
  const title = branding?.name ?? 'Turnero';

  const subtitle = useMemo(() => {
    if (branding) {
      return `Ingresá a ${branding.name}`;
    }
    return 'Agenda para tu equipo';
  }, [branding]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const response = await fetch(`${apiBase}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          ...(slug ? { companySlug: slug } : {}),
        }),
      });
      const body = (await response.json()) as {
        accessToken?: string;
        refreshToken?: string;
        message?: string | string[];
        error?: string;
        companies?: CompanyOption[];
      };
      if (response.status === 400 && body.error === 'COMPANY_REQUIRED') {
        setCompanies(body.companies ?? []);
        setError(
          typeof body.message === 'string'
            ? body.message
            : 'Indicá la empresa.',
        );
        return;
      }
      if (!response.ok || !body.accessToken || !body.refreshToken) {
        const message = Array.isArray(body.message)
          ? body.message[0]
          : body.message;
        setError(message || 'Email o contraseña incorrectos');
        return;
      }
      writeSession({
        accessToken: body.accessToken,
        refreshToken: body.refreshToken,
      });
      router.replace('/agenda');
    } catch {
      setError('No se pudo conectar con la API.');
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-[minmax(280px,42%)_1fr]">
      <section
        className="relative hidden flex-col justify-between bg-sidebar p-10 text-white lg:flex"
        style={{
          background: `linear-gradient(165deg, #0b1220 0%, ${accent} 160%)`,
        }}
      >
        <p className="flex items-center gap-3 text-sm font-semibold tracking-wide text-white/80">
          {branding?.logoUrl ? (
            <img
              src={branding.logoUrl}
              alt=""
              className="h-8 rounded bg-white/10 object-contain p-1"
            />
          ) : null}
          {title}
        </p>
        <div>
          <h1 className="max-w-sm text-4xl font-semibold tracking-tight">
            {subtitle}
          </h1>
          <p className="mt-3 max-w-sm text-sm text-white/70">
            Turnos, equipo y sucursales en un solo lugar.
          </p>
        </div>
        <p className="text-xs text-white/50">Turnero</p>
      </section>
      <section className="grid place-items-center bg-canvas px-4 py-10">
        <form
          onSubmit={onSubmit}
          className="w-full max-w-[400px] rounded-xl border border-line bg-paper p-7 shadow-soft"
        >
          <p className="lg:hidden text-sm font-semibold text-accent">{title}</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">
            Iniciar sesión
          </h2>
          <p className="mt-1 mb-6 text-sm text-muted">
            Email y contraseña. El tenant sale del login, no de un header.
          </p>

          <label className={labelClass}>
            Email
            <input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className={cn(labelClass, 'mt-3')}>
            Contraseña
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
          </label>
          {!initialSlug ? (
            <label className={cn(labelClass, 'mt-3')}>
              Empresa (slug, opcional)
              <input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="studio-elegance"
                className={inputClass}
              />
            </label>
          ) : null}

          {companies.length > 0 ? (
            <div className="mt-4 mb-2 flex flex-wrap gap-2">
              {companies.map((company) => (
                <button
                  key={company.slug}
                  type="button"
                  onClick={() => setSlug(company.slug)}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-sm',
                    slug === company.slug
                      ? 'bg-accent text-white'
                      : 'bg-canvas text-ink',
                  )}
                >
                  {company.name}
                </button>
              ))}
            </div>
          ) : null}

          {error ? (
            <div className="mt-4">
              <Alert>{error}</Alert>
            </div>
          ) : null}

          <button
            type="submit"
            disabled={pending}
            className={cn(btnPrimary, 'mt-6 w-full')}
            style={{ background: accent }}
          >
            {pending ? 'Ingresando…' : 'Ingresar'}
          </button>
          {!branding ? (
            <p className="mt-4 text-center text-sm text-muted">
              <a href="/e/studio-elegance/login" className={btnGhost}>
                Studio Élégance
              </a>
            </p>
          ) : null}
        </form>
      </section>
    </main>
  );
}
