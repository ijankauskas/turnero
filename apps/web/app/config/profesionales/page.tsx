'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AppShell } from '../../../components/app-shell';
import { apiJson } from '../../../lib/session';

type Professional = {
  id: string;
  displayName: string;
  color: string;
  title: string | null;
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
  active: boolean;
};
type Offer = {
  serviceId: string;
  price: number;
  remunerationType: 'PERCENT' | 'FIXED';
  remunerationValue: number;
  active: boolean;
};

const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export default function ConfigProfesionalesPage() {
  const [rows, setRows] = useState<Professional[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [catalog, setCatalog] = useState<CatalogService[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [color, setColor] = useState('#888888');
  const [branchIds, setBranchIds] = useState<string[]>([]);
  const [schedule, setSchedule] = useState<Block[]>([]);
  const [offers, setOffers] = useState<Record<string, Offer>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void Promise.all([
      apiJson<Professional[]>('/professionals'),
      apiJson<Branch[]>('/branches'),
      apiJson<CatalogService[]>('/services'),
    ])
      .then(([pros, b, services]) => {
        setRows(pros);
        setBranches(b);
        setCatalog(services);
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
      setBranchIds(pro.branches.map((row) => row.id));
      setSchedule(blocks);
      const next: Record<string, Offer> = {};
      for (const item of matrix) {
        next[item.serviceId] = item;
      }
      setOffers(next);
    } catch (err) {
      setError((err as Error).message);
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
        price: service.basePrice,
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
        body: JSON.stringify({ displayName, color }),
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
      const saved = await apiJson<Block[]>(`/professionals/${selected}/schedule`, {
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
      });
      setSchedule(saved);
      setRows(await apiJson<Professional[]>('/professionals'));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const current = rows.find((row) => row.id === selected);

  return (
    <AppShell allow={['ADMINISTRADOR']}>
      <section style={{ padding: '1.25rem' }}>
        <h1>Profesionales</h1>
        {error ? <p role="alert">{error}</p> : null}
        <ul>
          {rows.map((row) => (
            <li key={row.id}>
              <button type="button" onClick={() => void openFicha(row.id)}>
                {row.displayName}
                {row.active === false ? ' (inactivo)' : ''}
              </button>{' '}
              · {row.branches.map((b) => b.name).join(', ') || 'sin sucursal'}
            </li>
          ))}
        </ul>
        {selected && current ? (
          <form onSubmit={saveFicha}>
            <h2>Ficha de {current.displayName}</h2>
            <label>
              Nombre en agenda
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </label>
            <label>
              Color
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
              />
            </label>
            <fieldset>
              <legend>Sucursales</legend>
              {branches.map((row) => (
                <label key={row.id} style={{ display: 'block' }}>
                  <input
                    type="checkbox"
                    checked={branchIds.includes(row.id)}
                    onChange={(e) => {
                      setBranchIds((currentIds) =>
                        e.target.checked
                          ? [...currentIds, row.id]
                          : currentIds.filter((id) => id !== row.id),
                      );
                    }}
                  />{' '}
                  {row.name}
                </label>
              ))}
            </fieldset>
            <h3>Precio y comisión</h3>
            <table style={{ width: '100%', background: '#fff' }}>
              <thead>
                <tr>
                  <th align="left">Servicio</th>
                  <th>Ofrece</th>
                  <th>Precio</th>
                  <th>Tipo</th>
                  <th>Valor</th>
                </tr>
              </thead>
              <tbody>
                {catalog.map((service) => {
                  const offer = offers[service.id];
                  return (
                    <tr key={service.id}>
                      <td>
                        {service.name} ({service.durationMinutes} min)
                      </td>
                      <td align="center">
                        <input
                          type="checkbox"
                          checked={Boolean(offer)}
                          onChange={(e) =>
                            toggleOffer(service, e.target.checked)
                          }
                        />
                      </td>
                      <td>
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
                        />
                      </td>
                      <td>
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
                        >
                          <option value="PERCENT">%</option>
                          <option value="FIXED">Fijo</option>
                        </select>
                      </td>
                      <td>
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
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <h3>Horario semanal</h3>
            <p style={{ fontSize: 13, color: '#666' }}>
              Un profesional no puede tener dos sucursales el mismo día a la
              misma hora.
            </p>
            {schedule.map((block, index) => (
              <div
                key={`${block.weekday}-${index}`}
                style={{
                  display: 'flex',
                  gap: 8,
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  marginBottom: 8,
                }}
              >
                <select
                  value={block.weekday}
                  onChange={(e) =>
                    updateBlock(index, { weekday: Number(e.target.value) })
                  }
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
                />
                <input
                  type="time"
                  value={block.endTime}
                  onChange={(e) =>
                    updateBlock(index, { endTime: e.target.value })
                  }
                />
                <label>
                  <input
                    type="checkbox"
                    checked={block.isOff}
                    onChange={(e) =>
                      updateBlock(index, { isOff: e.target.checked })
                    }
                  />{' '}
                  Franco
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setSchedule((currentBlocks) =>
                      currentBlocks.filter((_, i) => i !== index),
                    )
                  }
                >
                  Quitar
                </button>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button type="button" onClick={addBlock}>
                Agregar bloque
              </button>
              <button type="submit" disabled={saving}>
                Guardar ficha
              </button>
              {current.active !== false ? (
                <button
                  type="button"
                  onClick={() =>
                    void apiJson(`/professionals/${current.id}/deactivate`, {
                      method: 'POST',
                    })
                      .then(() =>
                        setRows((rows) =>
                          rows.map((row) =>
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
                <span>Inactivo: no entra en el alta de turnos.</span>
              )}
            </div>
          </form>
        ) : null}
      </section>
    </AppShell>
  );
}
