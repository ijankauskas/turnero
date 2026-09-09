'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AppShell } from '../../../components/app-shell';
import { ROLE_LABEL } from '../../../lib/labels';
import { apiJson } from '../../../lib/session';

type User = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  active: boolean;
};
type Branch = { id: string; name: string };

export default function ConfigUsuariosPage() {
  const [rows, setRows] = useState<User[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'RECEPCION',
    branchId: '',
  });

  async function load() {
    const [users, suc] = await Promise.all([
      apiJson<User[]>('/users'),
      apiJson<Branch[]>('/branches'),
    ]);
    setRows(users);
    setBranches(suc);
    setForm((current) => ({
      ...current,
      branchId: current.branchId || suc[0]?.id || '',
    }));
  }

  useEffect(() => {
    void load().catch((err: Error) => setError(err.message));
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    try {
      await apiJson('/users', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          branchId:
            form.role === 'ADMINISTRADOR' || form.role === 'PROFESIONAL'
              ? form.role === 'ADMINISTRADOR'
                ? undefined
                : form.branchId || undefined
              : form.branchId,
        }),
      });
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function deactivate(id: string) {
    setError(null);
    try {
      await apiJson(`/users/${id}/deactivate`, { method: 'POST' });
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <AppShell allow={['ADMINISTRADOR']}>
      <section style={{ padding: '1.25rem' }}>
        <h1>Usuarios</h1>
        {error ? <p role="alert">{error}</p> : null}
        <ul>
          {rows.map((row) => (
            <li key={row.id}>
              {row.lastName}, {row.firstName} · {row.email} ·{' '}
              {ROLE_LABEL[row.role] ?? row.role}
              {row.active ? '' : ' (inactivo)'}
              {row.active ? (
                <>
                  {' '}
                  <button type="button" onClick={() => void deactivate(row.id)}>
                    Desactivar
                  </button>
                </>
              ) : null}
            </li>
          ))}
        </ul>
        <form onSubmit={onSubmit} style={{ display: 'grid', gap: 8, maxWidth: 360 }}>
          <input
            placeholder="Nombre"
            value={form.firstName}
            onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            required
          />
          <input
            placeholder="Apellido"
            value={form.lastName}
            onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            required
          />
          <input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
          >
            {Object.entries(ROLE_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          {form.role !== 'ADMINISTRADOR' ? (
            <select
              value={form.branchId}
              onChange={(e) => setForm({ ...form, branchId: e.target.value })}
            >
              {branches.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                </option>
              ))}
            </select>
          ) : null}
          <button type="submit">Crear</button>
        </form>
      </section>
    </AppShell>
  );
}
