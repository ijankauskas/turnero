'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AppShell } from '../../components/app-shell';
import { apiJson } from '../../lib/session';

type Client = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
};

export default function ClientesPage() {
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState<Client[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
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
        body: JSON.stringify({ firstName, lastName, phone, forceCreate }),
      });
      setFirstName('');
      setLastName('');
      setPhone('');
      setMatches([]);
      await load();
    } catch (err) {
      const typed = err as Error & {
        status?: number;
        body?: { matches?: Client[]; error?: string };
      };
      if (typed.status === 409 && typed.body?.error === 'DUPLICATE_PHONE') {
        setMatches((typed.body.matches as Client[]) ?? []);
        setError('Ya hay un cliente con ese teléfono. Confirmá para crear otro.');
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
    <AppShell>
      <section style={{ padding: '1.25rem' }}>
        <h1 style={{ marginTop: 0 }}>Clientes</h1>
        <input
          placeholder="Buscar por nombre o teléfono"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void load(query);
          }}
        />
        <button type="button" onClick={() => void load(query)}>
          Buscar
        </button>
        {error ? <p role="alert">{error}</p> : null}
        <table style={{ width: '100%', marginTop: 16, background: '#fff' }}>
          <thead>
            <tr>
              <th align="left">Nombre</th>
              <th align="left">Teléfono</th>
              <th align="left">Email</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>
                  <a href={`/clientes/${row.id}`}>
                    {row.lastName}, {row.firstName}
                  </a>
                </td>
                <td>{row.phone}</td>
                <td>{row.email ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <h2>Alta</h2>
        <form onSubmit={onSubmit} style={{ display: 'grid', gap: 8, maxWidth: 360 }}>
          <input
            placeholder="Nombre"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
          />
          <input
            placeholder="Apellido"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
          />
          <input
            placeholder="Teléfono"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
          <button type="submit">Crear</button>
          {matches.length > 0 ? (
            <button type="button" onClick={() => void create(true)}>
              Crear igual
            </button>
          ) : null}
        </form>
      </section>
    </AppShell>
  );
}
