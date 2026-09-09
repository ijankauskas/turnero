'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AppShell } from '../../components/app-shell';
import { apiJson } from '../../lib/session';
import {
  Alert,
  btnGhost,
  btnPrimary,
  cardClass,
  cn,
  inputClass,
  Page,
  PageTitle,
  tdClass,
  thClass,
} from '../../components/ui';

type Client = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  active?: boolean;
};

export default function ClientesPage() {
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState<Client[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [matches, setMatches] = useState<Client[]>([]);

  async function load(search = query) {
    const data = await apiJson<Client[]>(
      `/clients${search ? `?query=${encodeURIComponent(search)}` : ''}`,
    );
    setRows(data);
  }

  useEffect(() => {
    void load().catch((err: Error) => setError(err.message));
  }, []);

  async function create(forceCreate = false) {
    setError(null);
    try {
      await apiJson('/clients', {
        method: 'POST',
        body: JSON.stringify({
          firstName,
          lastName,
          phone,
          email: email || undefined,
          forceCreate,
        }),
      });
      setFirstName('');
      setLastName('');
      setPhone('');
      setEmail('');
      setMatches([]);
      await load();
    } catch (err) {
      const typed = err as Error & {
        status?: number;
        body?: { matches?: Client[]; error?: string };
      };
      if (typed.status === 409 && typed.body?.error === 'DUPLICATE_PHONE') {
        setMatches((typed.body.matches as Client[]) ?? []);
        setError(
          'Ya hay un cliente con ese teléfono. Si es otra persona, confirmá para crear igual.',
        );
        return;
      }
      setError(typed.message);
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    await create(false);
  }

  return (
    <AppShell allow={['ADMINISTRADOR', 'ENCARGADO', 'RECEPCION']}>
      <Page>
        <PageTitle kicker="Directorio">Clientes</PageTitle>
        <div className="mb-5 flex flex-wrap gap-2">
          <input
            placeholder="Buscar por nombre o teléfono"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void load(query);
            }}
            className={cn(inputClass, 'mt-0 max-w-sm')}
          />
          <button type="button" onClick={() => void load(query)} className={btnGhost}>
            Buscar
          </button>
        </div>
        {error ? <Alert>{error}</Alert> : null}
        {matches.length > 0 ? (
          <ul className="mt-3 text-sm">
            {matches.map((row) => (
              <li key={row.id}>
                Coincide:{' '}
                <a
                  href={`/clientes/${row.id}`}
                  className="underline decoration-line underline-offset-4"
                >
                  {row.lastName}, {row.firstName} · {row.phone}
                </a>
              </li>
            ))}
          </ul>
        ) : null}
        {rows.length === 0 ? (
          <p className="text-sm text-muted">No hay clientes todavía.</p>
        ) : null}
        <div className={cn(cardClass, 'mt-4 overflow-hidden')}>
          <table className="w-full">
            <thead>
              <tr>
                <th className={thClass}>Nombre</th>
                <th className={thClass}>Teléfono</th>
                <th className={thClass}>Email</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-canvas">
                  <td className={tdClass}>
                    <a
                      href={`/clientes/${row.id}`}
                      className="underline decoration-line underline-offset-4"
                    >
                      {row.lastName}, {row.firstName}
                    </a>
                    {row.active === false ? (
                      <span className="text-muted"> (inactivo)</span>
                    ) : (
                      ''
                    )}
                  </td>
                  <td className={tdClass}>{row.phone}</td>
                  <td className={tdClass}>{row.email ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <form
          onSubmit={onSubmit}
          className={cn(cardClass, 'mt-8 grid max-w-md gap-3 p-5')}
        >
          <h2 className="m-0 text-lg font-semibold">Alta</h2>
          <input
            placeholder="Nombre"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
            className={inputClass}
          />
          <input
            placeholder="Apellido"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
            className={inputClass}
          />
          <input
            placeholder="Teléfono"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            className={inputClass}
          />
          <input
            type="email"
            placeholder="Email (opcional)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
          <button type="submit" className={btnPrimary}>
            Crear
          </button>
          {matches.length > 0 ? (
            <button
              type="button"
              onClick={() => void create(true)}
              className={btnGhost}
            >
              Es otra persona: crear igual
            </button>
          ) : null}
        </form>
      </Page>
    </AppShell>
  );
}
