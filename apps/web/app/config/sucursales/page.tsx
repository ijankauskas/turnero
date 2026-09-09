'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AppShell } from '../../../components/app-shell';
import { apiJson } from '../../../lib/session';
import {
  Alert,
  btnDanger,
  btnPrimary,
  cardClass,
  cn,
  inputClass,
  Page,
  PageTitle,
} from '../../../components/ui';

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
      <Page>
        <p className="mb-4">
          <a
            href="/config"
            className="text-sm text-muted underline decoration-line underline-offset-4"
          >
            ← Configuración
          </a>
        </p>
        <PageTitle kicker="Locales">Sucursales</PageTitle>
        {error ? <Alert>{error}</Alert> : null}
        <ul className="m-0 mb-8 grid list-none gap-3 p-0">
          {rows.map((row) => (
            <li key={row.id} className={cn(cardClass, 'flex flex-wrap items-center gap-2 p-4')}>
              <input
                defaultValue={row.name}
                onBlur={(e) => {
                  if (e.target.value !== row.name) {
                    void patch(row.id, { name: e.target.value });
                  }
                }}
                className={cn(inputClass, 'mt-0 max-w-[180px]')}
              />
              <input
                placeholder="Dirección"
                defaultValue={row.address ?? ''}
                onBlur={(e) => {
                  if ((e.target.value || null) !== row.address) {
                    void patch(row.id, { address: e.target.value || null });
                  }
                }}
                className={cn(inputClass, 'mt-0 min-w-[180px] flex-1')}
              />
              <input
                placeholder="Teléfono"
                defaultValue={row.phone ?? ''}
                onBlur={(e) => {
                  if ((e.target.value || null) !== row.phone) {
                    void patch(row.id, { phone: e.target.value || null });
                  }
                }}
                className={cn(inputClass, 'mt-0 max-w-[160px]')}
              />
              {row.active === false ? (
                <span className="text-sm text-muted">(inactiva)</span>
              ) : (
                <button
                  type="button"
                  className={btnDanger}
                  onClick={() => void patch(row.id, { active: false })}
                >
                  Desactivar
                </button>
              )}
            </li>
          ))}
        </ul>
        {rows.length === 0 ? (
          <p className="text-sm text-muted">No hay sucursales.</p>
        ) : null}
        <form onSubmit={onSubmit} className={cn(cardClass, 'grid max-w-md gap-3 p-5')}>
          <h2 className="m-0 text-lg font-semibold">Nueva sucursal</h2>
          <input
            placeholder="Nombre"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className={inputClass}
          />
          <input
            placeholder="Dirección"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className={inputClass}
          />
          <input
            placeholder="Teléfono"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={inputClass}
          />
          <button type="submit" className={btnPrimary}>
            Agregar
          </button>
        </form>
      </Page>
    </AppShell>
  );
}
