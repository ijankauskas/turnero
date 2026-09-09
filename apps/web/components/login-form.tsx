'use client';

import { FormEvent, useMemo, useState, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import { apiBase, writeSession } from '../lib/session';

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

  const accent = branding?.primaryColor ?? '#1a1a1a';
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
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: '2rem 1rem',
        background: branding?.secondaryColor ?? '#f6f4f1',
      }}
    >
      <form
        onSubmit={onSubmit}
        style={{
          width: '100%',
          maxWidth: 420,
          background: '#fff',
          borderRadius: 16,
          padding: '2rem',
          boxShadow: '0 16px 40px rgba(0,0,0,0.08)',
        }}
      >
        <p
          style={{
            margin: 0,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            fontSize: 12,
            color: accent,
          }}
        >
          {title}
        </p>
        <h1 style={{ margin: '0.4rem 0 0.3rem', fontSize: 28 }}>{subtitle}</h1>
        <p style={{ color: '#555', marginTop: 0 }}>
          Email y contraseña. El tenant sale del login, no de un header.
        </p>

        <label style={labelStyle}>
          Email
          <input
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
          />
        </label>
        <label style={labelStyle}>
          Contraseña
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
          />
        </label>
        {!initialSlug ? (
          <label style={labelStyle}>
            Empresa (slug, opcional)
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="studio-elegance"
              style={inputStyle}
            />
          </label>
        ) : null}

        {companies.length > 0 ? (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            {companies.map((company) => (
              <button
                key={company.slug}
                type="button"
                onClick={() => setSlug(company.slug)}
                style={{
                  ...buttonStyle,
                  background: slug === company.slug ? accent : '#eee',
                  color: slug === company.slug ? '#fff' : '#111',
                }}
              >
                {company.name}
              </button>
            ))}
          </div>
        ) : null}

        {error ? (
          <p role="alert" style={{ color: '#9b1c1c', fontSize: 14 }}>
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          style={{ ...buttonStyle, background: accent, width: '100%' }}
        >
          {pending ? 'Ingresando…' : 'Ingresar'}
        </button>
      </form>
    </main>
  );
}

const labelStyle: CSSProperties = {
  display: 'block',
  fontSize: 13,
  marginBottom: 12,
  color: '#333',
};

const inputStyle: CSSProperties = {
  display: 'block',
  width: '100%',
  marginTop: 6,
  padding: '10px 12px',
  borderRadius: 8,
  border: '1px solid #ddd',
  fontSize: 16,
  boxSizing: 'border-box',
};

const buttonStyle: CSSProperties = {
  border: 0,
  borderRadius: 8,
  padding: '10px 14px',
  color: '#fff',
  fontSize: 15,
  cursor: 'pointer',
};
