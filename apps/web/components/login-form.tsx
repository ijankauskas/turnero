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

  const accent = branding?.primaryColor ?? '#2c241c';
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
    <main
      className="grid min-h-screen place-items-center px-4 py-10"
      style={{ background: branding?.secondaryColor ?? '#f6f4f1' }}
    >
      <form
        onSubmit={onSubmit}
        className="w-full max-w-[440px] rounded-3xl border border-line/80 bg-paper p-8 shadow-soft"
      >
        <p
          className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em]"
          style={{ color: accent }}
        >
          {branding?.logoUrl ? (
            <img
              src={branding.logoUrl}
              alt=""
              className="h-7 object-contain"
            />
          ) : null}
          {title}
        </p>
        <h1 className="mt-2 font-serif text-4xl font-medium tracking-tight">
          {subtitle}
        </h1>
        <p className="mt-2 mb-6 text-sm text-muted">
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
                  'rounded-full px-3 py-1.5 text-sm',
                  slug === company.slug
                    ? 'bg-ink text-white'
                    : 'bg-cream text-ink',
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
    </main>
  );
}
