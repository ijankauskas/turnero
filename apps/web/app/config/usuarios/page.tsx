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
  branchId: string | null;
};
type Branch = { id: string; name: string };

const EMPTY = {
  email: '',
  password: '',
  firstName: '',
  lastName: '',
  role: 'RECEPCION',
  branchId: '',
  active: true,
};

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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY);

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
  }

  useEffect(() => {
    void load(page, search).catch((err: Error) => setError(err.message));
  }, [page, search]);

  function closeModal() {
    setOpen(false);
    setEditingId(null);
    setForm(EMPTY);
    setError(null);
  }

  function openCreate() {
    setError(null);
    setEditingId(null);
    setForm({ ...EMPTY, branchId: branches[0]?.id || '' });
    setOpen(true);
  }

  function openEdit(row: User) {
    setError(null);
    setEditingId(row.id);
    setForm({
      email: row.email,
      password: '',
      firstName: row.firstName,
      lastName: row.lastName,
      role: row.role,
      branchId: row.branchId ?? '',
      active: row.active,
    });
    setOpen(true);
  }

  function branchName(branchId: string | null) {
    if (!branchId) return '—';
    return branches.find((row) => row.id === branchId)?.name ?? '—';
  }

  function branchPayload() {
    if (form.role === 'ADMINISTRADOR') return null;
    return form.branchId || null;
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      if (editingId) {
        const payload: Record<string, unknown> = {
          email: form.email,
          firstName: form.firstName,
          lastName: form.lastName,
          role: form.role,
          branchId: branchPayload(),
          active: form.active,
        };
        if (form.password) payload.password = form.password;
        await apiJson(`/users/${editingId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        closeModal();
        await load();
        return;
      }
      await apiJson('/users', {
        method: 'POST',
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          firstName: form.firstName,
          lastName: form.lastName,
          role: form.role,
          branchId:
            form.role === 'ADMINISTRADOR' ? undefined : form.branchId || undefined,
        }),
      });
      closeModal();
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
            <button type="button" className={btnPrimary} onClick={openCreate}>
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
                <th className={thClass}>Sucursal</th>
                <th className={thClass}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-canvas">
                  <td className={tdClass}>
                    {row.lastName}, {row.firstName}
                    {row.active ? (
                      ''
                    ) : (
                      <span className="text-muted"> (inactivo)</span>
                    )}
                  </td>
                  <td className={tdClass}>{row.email}</td>
                  <td className={tdClass}>{ROLE_LABEL[row.role] ?? row.role}</td>
                  <td className={tdClass}>{branchName(row.branchId)}</td>
                  <td className={cn(tdClass, 'text-right')}>
                    <div className="flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        className={btnGhost}
                        onClick={() => openEdit(row)}
                      >
                        Editar
                      </button>
                      {row.active ? (
                        <button
                          type="button"
                          onClick={() => void deactivate(row.id)}
                          className={btnDanger}
                        >
                          Desactivar
                        </button>
                      ) : null}
                    </div>
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
            title={editingId ? 'Editar usuario' : 'Nuevo usuario'}
            onClose={closeModal}
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
                {editingId ? 'Nueva contraseña (opcional)' : 'Contraseña'}
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  required={!editingId}
                  minLength={8}
                  className={inputClass}
                />
              </label>
              {editingId ? (
                <p className="text-xs text-muted">
                  Dejála vacía para no cambiar la contraseña.
                </p>
              ) : null}
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
                    {form.role === 'PROFESIONAL' ? (
                      <option value="">Sin sucursal de acceso</option>
                    ) : null}
                    {branches.map((row) => (
                      <option key={row.id} value={row.id}>
                        {row.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              {editingId ? (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) =>
                      setForm({ ...form, active: e.target.checked })
                    }
                    className="size-4 rounded border-line"
                  />
                  Activo
                </label>
              ) : null}
              <button type="submit" className={btnPrimary}>
                {editingId ? 'Guardar' : 'Crear'}
              </button>
            </form>
          </Modal>
        ) : null}
      </Page>
    </AppShell>
  );
}
