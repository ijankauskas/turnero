'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AppShell } from '../../../components/app-shell';
import { ROLE_LABEL } from '../../../lib/labels';
import { apiItems, apiPage } from '../../../lib/paging';
import { apiJson } from '../../../lib/session';
import {
  Alert,
  btnDanger,
  btnGhost,
  btnPrimary,
  cardClass,
  cn,
  inputClass,
  labelClass,
  Modal,
  Page,
  PageTitle,
  Pager,
  tdClass,
  thClass,
} from '../../../components/ui';

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
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [total, setTotal] = useState(0);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'RECEPCION',
    branchId: '',
  });

  async function load(nextPage = page, nextSearch = search) {
    const [users, suc] = await Promise.all([
      apiPage<User>('/users', {
        query: nextSearch,
        page: nextPage,
        pageSize: 20,
      }),
      apiItems<Branch>('/branches'),
    ]);
    setRows(users.items);
    setTotal(users.total);
    setPage(users.page);
    setPageCount(users.pageCount);
    setBranches(suc);
    setForm((current) => ({
      ...current,
      branchId: current.branchId || suc[0]?.id || '',
    }));
  }

  useEffect(() => {
    void load(page, search).catch((err: Error) => setError(err.message));
  }, [page, search]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
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
      setForm({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        role: 'RECEPCION',
        branchId: branches[0]?.id || '',
      });
      setOpen(false);
      setPage(1);
      setSearch('');
      setQuery('');
      await load(1, '');
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
      <Page>
        <p className="mb-4">
          <a
            href="/config"
            className="text-sm text-muted underline decoration-line underline-offset-4"
          >
            ← Configuración
          </a>
        </p>
        <PageTitle
          kicker="Accesos"
          actions={
            <button
              type="button"
              className={btnPrimary}
              onClick={() => {
                setError(null);
                setOpen(true);
              }}
            >
              Nuevo usuario
            </button>
          }
        >
          Usuarios
        </PageTitle>
        <div className="mb-5 flex flex-wrap gap-2">
          <input
            placeholder="Buscar por nombre o email"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setPage(1);
                setSearch(query);
              }
            }}
            className={cn(inputClass, 'mt-0 max-w-sm')}
          />
          <button
            type="button"
            onClick={() => {
              setPage(1);
              setSearch(query);
            }}
            className={btnGhost}
          >
            Buscar
          </button>
        </div>
        {error && !open ? <Alert>{error}</Alert> : null}
        <div className={cn(cardClass, 'overflow-hidden')}>
          <table className="w-full">
            <thead>
              <tr>
                <th className={thClass}>Nombre</th>
                <th className={thClass}>Email</th>
                <th className={thClass}>Rol</th>
                <th className={thClass}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-canvas">
                  <td className={tdClass}>
                    {row.lastName}, {row.firstName}
                    {row.active ? '' : (
                      <span className="text-muted"> (inactivo)</span>
                    )}
                  </td>
                  <td className={tdClass}>{row.email}</td>
                  <td className={tdClass}>{ROLE_LABEL[row.role] ?? row.role}</td>
                  <td className={cn(tdClass, 'text-right')}>
                    {row.active ? (
                      <button
                        type="button"
                        onClick={() => void deactivate(row.id)}
                        className={btnDanger}
                      >
                        Desactivar
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pager
            page={page}
            pageCount={pageCount}
            total={total}
            onPage={setPage}
          />
        </div>
        {open ? (
          <Modal
            title="Nuevo usuario"
            onClose={() => {
              setOpen(false);
              setError(null);
            }}
          >
            {error ? <Alert>{error}</Alert> : null}
            <form onSubmit={onSubmit} className="grid gap-3">
              <label className={labelClass}>
                Nombre
                <input
                  value={form.firstName}
                  onChange={(e) =>
                    setForm({ ...form, firstName: e.target.value })
                  }
                  required
                  className={inputClass}
                />
              </label>
              <label className={labelClass}>
                Apellido
                <input
                  value={form.lastName}
                  onChange={(e) =>
                    setForm({ ...form, lastName: e.target.value })
                  }
                  required
                  className={inputClass}
                />
              </label>
              <label className={labelClass}>
                Email
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                  className={inputClass}
                />
              </label>
              <label className={labelClass}>
                Contraseña
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  required
                  className={inputClass}
                />
              </label>
              <label className={labelClass}>
                Rol
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className={inputClass}
                >
                  {Object.entries(ROLE_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              {form.role !== 'ADMINISTRADOR' ? (
                <label className={labelClass}>
                  Sucursal
                  <select
                    value={form.branchId}
                    onChange={(e) =>
                      setForm({ ...form, branchId: e.target.value })
                    }
                    className={inputClass}
                  >
                    {branches.map((row) => (
                      <option key={row.id} value={row.id}>
                        {row.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <button type="submit" className={btnPrimary}>
                Crear
              </button>
            </form>
          </Modal>
        ) : null}
      </Page>
    </AppShell>
  );
}
