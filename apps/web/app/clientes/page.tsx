'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AppShell } from '../../components/app-shell';
import { apiJson } from '../../lib/session';
import { apiPage } from '../../lib/paging';
import {
  Alert,
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
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [total, setTotal] = useState(0);
  const [rows, setRows] = useState<Client[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [active, setActive] = useState(true);
  const [matches, setMatches] = useState<Client[]>([]);

  async function load(nextPage = page, nextSearch = search) {
    const data = await apiPage<Client>('/clients', {
      query: nextSearch,
      page: nextPage,
      pageSize: 20,
    });
    setRows(data.items);
    setTotal(data.total);
    setPage(data.page);
    setPageCount(data.pageCount);
  }

  useEffect(() => {
    void load(page, search).catch((err: Error) => setError(err.message));
  }, [page, search]);

  function resetForm() {
    setEditingId(null);
    setFirstName('');
    setLastName('');
    setPhone('');
    setEmail('');
    setActive(true);
    setMatches([]);
    setError(null);
  }

  function openCreate() {
    resetForm();
    setOpen(true);
  }

  function openEdit(row: Client) {
    setError(null);
    setMatches([]);
    setEditingId(row.id);
    setFirstName(row.firstName);
    setLastName(row.lastName);
    setPhone(row.phone);
    setEmail(row.email ?? '');
    setActive(row.active !== false);
    setOpen(true);
  }

  function closeModal() {
    setOpen(false);
    resetForm();
  }

  async function save(forceCreate = false) {
    setError(null);
    try {
      if (editingId) {
        await apiJson(`/clients/${editingId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            firstName,
            lastName,
            phone,
            email: email || null,
            active,
          }),
        });
        closeModal();
        await load();
        return;
      }
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
      closeModal();
      setPage(1);
      setSearch('');
      setQuery('');
      await load(1, '');
    } catch (err) {
      const typed = err as Error & {
        status?: number;
        body?: { matches?: Client[]; error?: string };
      };
      if (
        !editingId &&
        typed.status === 409 &&
        typed.body?.error === 'DUPLICATE_PHONE'
      ) {
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
    await save(false);
  }

  return (
    <AppShell allow={['ADMINISTRADOR', 'ENCARGADO', 'RECEPCION']}>
      <Page>
        <PageTitle
          kicker="Directorio"
          actions={
            <button type="button" className={btnPrimary} onClick={openCreate}>
              Nuevo cliente
            </button>
          }
        >
          Clientes
        </PageTitle>
        <div className="mb-5 flex flex-wrap gap-2">
          <input
            placeholder="Buscar por nombre o teléfono"
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
                <th className={thClass}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-canvas">
                  <td className={tdClass}>
                    {row.lastName}, {row.firstName}
                    {row.active === false ? (
                      <span className="text-muted"> (inactivo)</span>
                    ) : (
                      ''
                    )}
                  </td>
                  <td className={tdClass}>{row.phone}</td>
                  <td className={tdClass}>{row.email ?? '—'}</td>
                  <td className={cn(tdClass, 'text-right')}>
                    <div className="flex flex-wrap justify-end gap-2">
                      <a
                        href={`/clientes/${row.id}`}
                        className={btnGhost}
                      >
                        Ver ficha
                      </a>
                      <button
                        type="button"
                        className={btnGhost}
                        onClick={() => openEdit(row)}
                      >
                        Editar
                      </button>
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
            title={editingId ? 'Editar cliente' : 'Nuevo cliente'}
            onClose={closeModal}
          >
            {error ? <Alert>{error}</Alert> : null}
            {matches.length > 0 ? (
              <ul className="mb-3 text-sm">
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
            <form onSubmit={onSubmit} className="grid gap-3">
              <label className={labelClass}>
                Nombre
                <input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  className={inputClass}
                />
              </label>
              <label className={labelClass}>
                Apellido
                <input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  className={inputClass}
                />
              </label>
              <label className={labelClass}>
                Teléfono
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className={inputClass}
                />
              </label>
              <label className={labelClass}>
                Email (opcional)
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                />
              </label>
              {editingId ? (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                    className="size-4 rounded border-line"
                  />
                  Activo
                </label>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <button type="submit" className={btnPrimary}>
                  {editingId ? 'Guardar' : 'Crear'}
                </button>
                {matches.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => void save(true)}
                    className={btnGhost}
                  >
                    Es otra persona: crear igual
                  </button>
                ) : null}
              </div>
            </form>
          </Modal>
        ) : null}
      </Page>
    </AppShell>
  );
}
