'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AppShell } from '../../../components/app-shell';
import { apiJson } from '../../../lib/session';

type Branch = {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  active?: boolean;
};

export default function ConfigSucursalesPage() {
  const [rows, setRows] = useState<Branch[]>([]);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setRows(await apiJson<Branch[]>('/branches'));
  }

  useEffect(() => {
    void load().catch((err: Error) => setError(err.message));
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    try {
      await apiJson('/branches', {
        method: 'POST',
        body: JSON.stringify({
          name,
          address: address || undefined,
          phone: phone || undefined,
        }),
      });
      setName('');
      setAddress('');
      setPhone('');
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function patch(id: string, data: Partial<Branch>) {
    setError(null);
    try {
      await apiJson(`/branches/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <AppShell allow={['ADMINISTRADOR']}>
      <section style={{ padding: '1.25rem' }}>
        <h1>Sucursales</h1>
        {error ? <p role="alert">{error}</p> : null}
        <ul>
          {rows.map((row) => (
            <li key={row.id} style={{ marginBottom: 12 }}>
              <input
                defaultValue={row.name}
                onBlur={(e) => {
                  if (e.target.value !== row.name) {
                    void patch(row.id, { name: e.target.value });
                  }
                }}
              />{' '}
              <input
                placeholder="Dirección"
                defaultValue={row.address ?? ''}
                onBlur={(e) => {
                  if ((e.target.value || null) !== row.address) {
                    void patch(row.id, { address: e.target.value || null });
                  }
                }}
              />{' '}
              <input
                placeholder="Teléfono"
                defaultValue={row.phone ?? ''}
                onBlur={(e) => {
                  if ((e.target.value || null) !== row.phone) {
                    void patch(row.id, { phone: e.target.value || null });
                  }
                }}
              />
            </li>
          ))}
        </ul>
        <form onSubmit={onSubmit} style={{ display: 'grid', gap: 8, maxWidth: 360 }}>
          <h2>Nueva sucursal</h2>
          <input
            placeholder="Nombre"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            placeholder="Dirección"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
          <input
            placeholder="Teléfono"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <button type="submit">Agregar</button>
        </form>
      </section>
    </AppShell>
  );
}
