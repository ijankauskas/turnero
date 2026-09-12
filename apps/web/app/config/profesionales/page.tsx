'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AppShell } from '../../../components/app-shell';
import { apiItems } from '../../../lib/paging';
import { apiJson, apiUpload } from '../../../lib/session';
import {
  Alert,
  btnDanger,
  btnGhost,
  btnPrimary,
  cardClass,
  cn,
  controlClass,
  inputClass,
  labelClass,
  Page,
  PageTitle,
  tdClass,
  thClass,
} from '../../../components/ui';

type Professional = {
  id: string;
  displayName: string;
  color: string;
  title: string | null;
  photoUrl?: string | null;
  active?: boolean;
  branches: Array<{ id: string; name: string }>;
};

type Block = {
  weekday: number;
  branchId: string;
  startTime: string;
  endTime: string;
  isOff: boolean;
};

type Branch = { id: string; name: string };

type CatalogService = {
  id: string;
  name: string;
  durationMinutes: number;
  basePrice: number;
  openPrice?: boolean;
  active: boolean;
};

type Offer = {
  serviceId: string;
  price: number;
  remunerationType: 'PERCENT' | 'FIXED';
  remunerationValue: number;
  active: boolean;
};

type CreatedUser = {
  id: string;
  professionalId: string | null;
};

const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

type CreateForm = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  displayName: string;
  color: string;
  photoUrl: string;
  branchIds: string[];
};

const emptyCreate = (branchIds: string[] = []): CreateForm => ({
  email: '',
  password: '',
  firstName: '',
  lastName: '',
  displayName: '',
  color: '#7C6FF7',
  photoUrl: '',
  branchIds,
});

export default function ConfigProfesionalesPage() {
  const [rows, setRows] = useState<Professional[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [catalog, setCatalog] = useState<CatalogService[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [color, setColor] = useState('#888888');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [branchIds, setBranchIds] = useState<string[]>([]);
  const [schedule, setSchedule] = useState<Block[]>([]);
  const [offers, setOffers] = useState<Record<string, Offer>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>(emptyCreate());
  const [uploading, setUploading] = useState(false);

  async function reloadList() {
    setRows(await apiJson<Professional[]>('/professionals'));
  }

  useEffect(() => {
    void Promise.all([
      apiJson<Professional[]>('/professionals'),
      apiItems<Branch>('/branches'),
      apiItems<CatalogService>('/services'),
    ])
      .then(([pros, branchRows, services]) => {
        setRows(pros);
        setBranches(branchRows);
        setCatalog(services);
        setCreateForm(emptyCreate(branchRows[0] ? [branchRows[0].id] : []));
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  async function openFicha(id: string) {
    setSelected(id);
    setError(null);
    try {
      const [pro, blocks, matrix] = await Promise.all([
        apiJson<Professional>(`/professionals/${id}`),
        apiJson<Block[]>(`/professionals/${id}/schedule`),
        apiJson<Offer[]>(`/professionals/${id}/services`),
      ]);
      setDisplayName(pro.displayName);
      setColor(pro.color);
      setPhotoUrl(pro.photoUrl ?? null);
      setBranchIds(pro.branches.map((row) => row.id));
      setSchedule(blocks);
      const next: Record<string, Offer> = {};
      for (const item of matrix) next[item.serviceId] = item;
      setOffers(next);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function uploadPhoto(file: File | null, onUrl: (url: string) => void) {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const uploaded = await apiUpload('/uploads/image', file);
      onUrl(uploaded.url);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    if (!createForm.branchIds.length) {
      setError('Elegí al menos una sucursal');
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const created = await apiJson<CreatedUser>('/users', {
        method: 'POST',
        body: JSON.stringify({
          email: createForm.email.trim(),
          password: createForm.password,
          firstName: createForm.firstName.trim(),
          lastName: createForm.lastName.trim(),
          role: 'PROFESIONAL',
          displayName:
            createForm.displayName.trim() || createForm.firstName.trim(),
          color: createForm.color,
          branchId: createForm.branchIds[0] || undefined,
        }),
      });
      if (!created.professionalId) {
        throw new Error('No se creó la ficha del profesional');
      }
      if (createForm.photoUrl) {
        await apiJson(`/professionals/${created.professionalId}`, {
          method: 'PATCH',
          body: JSON.stringify({ photoUrl: createForm.photoUrl }),
        });
      }
      if (createForm.branchIds.length) {
        await apiJson(`/professionals/${created.professionalId}/branches`, {
          method: 'PUT',
          body: JSON.stringify({ branchIds: createForm.branchIds }),
        });
      }
      await reloadList();
      setCreateOpen(false);
      setCreateForm(emptyCreate(branches[0] ? [branches[0].id] : []));
      await openFicha(created.professionalId);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCreating(false);
    }
  }

  function addBlock() {
    setSchedule((current) => [
      ...current,
      {
        weekday: 0,
        branchId: branchIds[0] || branches[0]?.id || '',
        startTime: '09:00',
        endTime: '18:00',
        isOff: false,
      },
    ]);
  }

  function updateBlock(index: number, patch: Partial<Block>) {
    setSchedule((current) =>
      current.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  }

  function toggleOffer(service: CatalogService, included: boolean) {
    setOffers((current) => {
      const copy = { ...current };
      if (!included) {
        delete copy[service.id];
        return copy;
      }
      copy[service.id] = current[service.id] ?? {
        serviceId: service.id,
        price: service.openPrice ? 0 : service.basePrice,
        remunerationType: 'PERCENT',
        remunerationValue: 40,
        active: true,
      };
      return copy;
    });
  }

  async function saveFicha(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      await apiJson(`/professionals/${selected}`, {
        method: 'PATCH',
        body: JSON.stringify({ displayName, color, photoUrl }),
      });
      await apiJson(`/professionals/${selected}/branches`, {
        method: 'PUT',
        body: JSON.stringify({ branchIds }),
      });
      await apiJson(`/professionals/${selected}/services`, {
        method: 'PUT',
        body: JSON.stringify({
          items: Object.values(offers).map((item) => ({
            serviceId: item.serviceId,
            price: Number(item.price),
            remunerationType: item.remunerationType,
            remunerationValue: Number(item.remunerationValue),
            active: item.active,
          })),
        }),
      });
      const saved = await apiJson<Block[]>(
        `/professionals/${selected}/schedule`,
        {
          method: 'PUT',
          body: JSON.stringify({
            blocks: schedule.map((row) => ({
              weekday: Number(row.weekday),
              branchId: row.branchId,
              startTime: row.startTime,
              endTime: row.endTime,
              isOff: row.isOff,
            })),
          }),
        },
      );
      setSchedule(saved);
      await reloadList();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const current = rows.find((row) => row.id === selected);

  return (
    <AppShell allow={['ADMINISTRADOR']}>
      <Page className="max-w-7xl">
        <p className="mb-4">
          <a
            href="/config"
            className="text-sm text-muted underline decoration-line underline-offset-4"
          >
            ← Configuración
          </a>
        </p>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <PageTitle kicker="Equipo">Profesionales</PageTitle>
          <button
            type="button"
            className={btnPrimary}
            onClick={() => {
              setError(null);
              setCreateOpen(true);
            }}
          >
            Nuevo profesional
          </button>
        </div>
        {error ? <Alert>{error}</Alert> : null}

        {createOpen ? (
          <form
            onSubmit={onCreate}
            className={cn(cardClass, 'mb-6 grid max-w-xl gap-3 p-5')}
          >
            <h2 className="m-0 text-lg font-semibold">Alta de profesional</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className={labelClass}>
                Nombre
                <input
                  required
                  value={createForm.firstName}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, firstName: e.target.value })
                  }
                  className={inputClass}
                />
              </label>
              <label className={labelClass}>
                Apellido
                <input
                  required
                  value={createForm.lastName}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, lastName: e.target.value })
                  }
                  className={inputClass}
                />
              </label>
            </div>
            <label className={labelClass}>
              Nombre en agenda
              <input
                value={createForm.displayName}
                placeholder="Si vacío, usa el nombre"
                onChange={(e) =>
                  setCreateForm({ ...createForm, displayName: e.target.value })
                }
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Email (login)
              <input
                type="email"
                required
                value={createForm.email}
                onChange={(e) =>
                  setCreateForm({ ...createForm, email: e.target.value })
                }
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Contraseña temporal
              <input
                type="password"
                required
                minLength={8}
                value={createForm.password}
                onChange={(e) =>
                  setCreateForm({ ...createForm, password: e.target.value })
                }
                className={inputClass}
              />
            </label>
            <div className="flex flex-wrap items-end gap-3">
              <label className={labelClass}>
                Color
                <input
                  type="color"
                  value={createForm.color}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, color: e.target.value })
                  }
                  className="mt-1.5 block h-10 w-10 cursor-pointer rounded-lg border border-line bg-white p-0"
                />
              </label>
              <div className="min-w-0 flex-1">
                <p className={labelClass}>Foto</p>
                {createForm.photoUrl ? (
                  <img
                    src={createForm.photoUrl}
                    alt=""
                    className="mb-2 size-14 rounded-full object-cover"
                  />
                ) : null}
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploading}
                  onChange={(e) =>
                    void uploadPhoto(e.target.files?.[0] ?? null, (url) =>
                      setCreateForm((current) => ({
                        ...current,
                        photoUrl: url,
                      })),
                    )
                  }
                  className="mt-1 block w-full text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-canvas file:px-3 file:py-2 file:text-sm file:font-medium"
                />
              </div>
            </div>
            <fieldset className="rounded-xl border border-line p-3">
              <legend className="px-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
                Sucursales
              </legend>
              {branches.map((row) => (
                <label
                  key={row.id}
                  className="flex items-center gap-2 py-1 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={createForm.branchIds.includes(row.id)}
                    onChange={(e) => {
                      setCreateForm((current) => ({
                        ...current,
                        branchIds: e.target.checked
                          ? [...current.branchIds, row.id]
                          : current.branchIds.filter((id) => id !== row.id),
                      }));
                    }}
                    className="size-4 rounded border-line"
                  />
                  {row.name}
                </label>
              ))}
            </fieldset>
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={creating || uploading}
                className={btnPrimary}
              >
                {creating ? 'Creando…' : 'Crear profesional'}
              </button>
              <button
                type="button"
                className={btnGhost}
                onClick={() => setCreateOpen(false)}
              >
                Cancelar
              </button>
            </div>
          </form>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <ul className="m-0 grid list-none content-start gap-2 p-0">
            {rows.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() => void openFicha(row.id)}
                  className={cn(
                    cardClass,
                    'flex w-full items-center gap-3 p-4 text-left transition hover:border-ink/20',
                    selected === row.id && 'border-accent bg-accent/10',
                  )}
                >
                  {row.photoUrl ? (
                    <img
                      src={row.photoUrl}
                      alt=""
                      className="size-9 rounded-full object-cover"
                    />
                  ) : (
                    <span
                      className="inline-block size-2.5 shrink-0 rounded-full"
                      style={{ background: row.color }}
                    />
                  )}
                  <span className="min-w-0">
                    <strong className="block truncate">{row.displayName}</strong>
                    {row.active === false ? (
                      <span className="text-muted"> (inactivo)</span>
                    ) : null}
                    <span className="mt-0.5 block text-xs text-muted">
                      {row.branches.map((b) => b.name).join(', ') ||
                        'sin sucursal'}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>

          {selected && current ? (
            <form onSubmit={saveFicha} className={cn(cardClass, 'p-5')}>
              <h2 className="mt-0 text-lg font-semibold">
                Ficha de {current.displayName}
              </h2>
              <div className="flex flex-wrap items-end gap-3">
                <label className={cn(labelClass, 'min-w-0 flex-1')}>
                  Nombre en agenda
                  <input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className={cn(inputClass, 'h-10')}
                  />
                </label>
                <label className={labelClass}>
                  Color
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="mt-1.5 block h-10 w-10 cursor-pointer rounded-lg border border-line bg-white p-0"
                  />
                </label>
              </div>
              <div className="mt-3">
                <p className={labelClass}>Foto</p>
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt=""
                    className="mb-2 size-16 rounded-full object-cover"
                  />
                ) : null}
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploading}
                  onChange={(e) =>
                    void uploadPhoto(
                      e.target.files?.[0] ?? null,
                      (url) => setPhotoUrl(url),
                    )
                  }
                  className="mt-1 block w-full text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-canvas file:px-3 file:py-2 file:text-sm file:font-medium"
                />
              </div>
              <fieldset className="mt-4 rounded-2xl border border-line p-3">
                <legend className="px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                  Sucursales
                </legend>
                {branches.map((row) => (
                  <label
                    key={row.id}
                    className="flex items-center gap-2 py-1 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={branchIds.includes(row.id)}
                      onChange={(e) => {
                        setBranchIds((ids) =>
                          e.target.checked
                            ? [...ids, row.id]
                            : ids.filter((id) => id !== row.id),
                        );
                      }}
                      className="size-4 rounded border-line"
                    />
                    {row.name}
                  </label>
                ))}
              </fieldset>
              <h3 className="mt-6 text-xl">Precio y comisión</h3>
              <div className="overflow-x-auto rounded-2xl border border-line">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className={thClass}>Servicio</th>
                      <th className={cn(thClass, 'text-center')}>Ofrece</th>
                      <th className={thClass}>Precio</th>
                      <th className={thClass}>Tipo</th>
                      <th className={thClass}>Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {catalog.map((service) => {
                      const offer = offers[service.id];
                      return (
                        <tr key={service.id}>
                          <td className={tdClass}>
                            {service.name} ({service.durationMinutes} min)
                          </td>
                          <td className={cn(tdClass, 'text-center')}>
                            <input
                              type="checkbox"
                              checked={Boolean(offer)}
                              onChange={(e) =>
                                toggleOffer(service, e.target.checked)
                              }
                              className="size-4 rounded border-line"
                            />
                          </td>
                          <td className={tdClass}>
                            {service.openPrice ? (
                              <span className="text-sm text-muted">
                                A definir
                              </span>
                            ) : (
                              <input
                                type="number"
                                disabled={!offer}
                                value={offer?.price ?? service.basePrice}
                                onChange={(e) =>
                                  setOffers((currentOffers) => ({
                                    ...currentOffers,
                                    [service.id]: {
                                      ...currentOffers[service.id],
                                      price: Number(e.target.value),
                                    },
                                  }))
                                }
                                className={cn(inputClass, 'mt-0 w-24')}
                              />
                            )}
                          </td>
                          <td className={tdClass}>
                            <select
                              disabled={!offer}
                              value={offer?.remunerationType ?? 'PERCENT'}
                              onChange={(e) =>
                                setOffers((currentOffers) => ({
                                  ...currentOffers,
                                  [service.id]: {
                                    ...currentOffers[service.id],
                                    remunerationType: e.target.value as
                                      | 'PERCENT'
                                      | 'FIXED',
                                  },
                                }))
                              }
                              className={cn(inputClass, 'mt-0 w-24')}
                            >
                              <option value="PERCENT">%</option>
                              <option value="FIXED">Fijo</option>
                            </select>
                          </td>
                          <td className={tdClass}>
                            <input
                              type="number"
                              disabled={!offer}
                              value={offer?.remunerationValue ?? 40}
                              onChange={(e) =>
                                setOffers((currentOffers) => ({
                                  ...currentOffers,
                                  [service.id]: {
                                    ...currentOffers[service.id],
                                    remunerationValue: Number(e.target.value),
                                  },
                                }))
                              }
                              className={cn(inputClass, 'mt-0 w-24')}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <h3 className="mt-6 text-xl">Horario semanal</h3>
              <p className="text-[13px] text-muted">
                Un profesional no puede tener dos sucursales el mismo día a la
                misma hora.
              </p>
              {schedule.map((block, index) => (
                <div
                  key={`${block.weekday}-${index}`}
                  className="mb-2 flex flex-wrap items-center gap-2"
                >
                  <select
                    value={block.weekday}
                    onChange={(e) =>
                      updateBlock(index, {
                        weekday: Number(e.target.value),
                      })
                    }
                    className={cn(controlClass, 'mt-0')}
                  >
                    {DAYS.map((day, weekday) => (
                      <option key={day} value={weekday}>
                        {day}
                      </option>
                    ))}
                  </select>
                  <select
                    value={block.branchId}
                    onChange={(e) =>
                      updateBlock(index, { branchId: e.target.value })
                    }
                    className={cn(controlClass, 'mt-0')}
                  >
                    {branches.map((row) => (
                      <option key={row.id} value={row.id}>
                        {row.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="time"
                    value={block.startTime}
                    onChange={(e) =>
                      updateBlock(index, { startTime: e.target.value })
                    }
                    className={cn(controlClass, 'mt-0')}
                  />
                  <input
                    type="time"
                    value={block.endTime}
                    onChange={(e) =>
                      updateBlock(index, { endTime: e.target.value })
                    }
                    className={cn(controlClass, 'mt-0')}
                  />
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={block.isOff}
                      onChange={(e) =>
                        updateBlock(index, { isOff: e.target.checked })
                      }
                      className="size-4 rounded border-line"
                    />
                    Franco
                  </label>
                  <button
                    type="button"
                    className={btnGhost}
                    onClick={() =>
                      setSchedule((blocks) =>
                        blocks.filter((_, i) => i !== index),
                      )
                    }
                  >
                    Quitar
                  </button>
                </div>
              ))}
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" onClick={addBlock} className={btnGhost}>
                  Agregar bloque
                </button>
                <button type="submit" disabled={saving} className={btnPrimary}>
                  Guardar ficha
                </button>
                {current.active !== false ? (
                  <button
                    type="button"
                    className={btnDanger}
                    onClick={() =>
                      void apiJson(`/professionals/${current.id}/deactivate`, {
                        method: 'POST',
                      })
                        .then(() =>
                          setRows((list) =>
                            list.map((row) =>
                              row.id === current.id
                                ? { ...row, active: false }
                                : row,
                            ),
                          ),
                        )
                        .catch((err: Error) => setError(err.message))
                    }
                  >
                    Desactivar
                  </button>
                ) : (
                  <span className="text-sm text-muted">
                    Inactivo: no entra en el alta de turnos.
                  </span>
                )}
              </div>
            </form>
          ) : null}
        </div>
      </Page>
    </AppShell>
  );
}
