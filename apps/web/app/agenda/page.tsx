'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppShell } from '../../components/app-shell';
import { AppointmentPanel } from '../../components/agenda/appointment-panel';
import { DayGrid } from '../../components/agenda/day-grid';
import { MiniCalendar } from '../../components/agenda/mini-calendar';
import { MonthView } from '../../components/agenda/month-view';
import { NewAppointmentForm } from '../../components/agenda/new-appointment-form';
import { WeekView } from '../../components/agenda/week-view';
import type {
  AgendaView,
  Appointment,
  Branch,
  DailyReport,
  LiveReport,
  Professional,
} from '../../components/agenda/types';
import {
  addDays,
  dateInZone,
  formatClock,
  formatLongDate,
  monthStart,
  nextMonthStart,
  startOfIsoWeek,
  todayInZone,
  zonedLocalToUtc,
} from '../../lib/datetime';
import { apiJson } from '../../lib/session';
import type { MeResponse } from '../../lib/types';

export default function AgendaPage() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [view, setView] = useState<AgendaView>('day');
  const [date, setDate] = useState('');
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [selectedPros, setSelectedPros] = useState<Set<string>>(new Set());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState('');
  const [daily, setDaily] = useState<DailyReport | null>(null);
  const [live, setLive] = useState<LiveReport | null>(null);
  const [note, setNote] = useState('');
  const [selected, setSelected] = useState<Appointment | null>(null);
  const [create, setCreate] = useState<{
    professionalId?: string;
    time?: string;
    date?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const noteKeyRef = useRef('');

  const timezone = me?.company.timezone ?? 'America/Argentina/Buenos_Aires';
  const role = me?.user.role;
  const isStaff = role !== 'PROFESIONAL';
  const canWrite =
    role === 'ADMINISTRADOR' ||
    role === 'ENCARGADO' ||
    role === 'RECEPCION';
  const isAdmin = role === 'ADMINISTRADOR';
  const noteBranch = branchId || me?.user.branchId || branches[0]?.id || '';

  useEffect(() => {
    void apiJson<MeResponse>('/auth/me')
      .then((row) => {
        setMe(row);
        setDate((current) => current || todayInZone(row.company.timezone));
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  const load = useCallback(async () => {
    if (!me || !date) return;
    const from =
      view === 'week'
        ? startOfIsoWeek(date)
        : view === 'month'
          ? monthStart(date)
          : date;
    const toExclusive =
      view === 'week'
        ? addDays(startOfIsoWeek(date), 7)
        : view === 'month'
          ? nextMonthStart(date)
          : addDays(date, 1);
    const fromIso = zonedLocalToUtc(from, '00:00', timezone).toISOString();
    const toIso = zonedLocalToUtc(toExclusive, '00:00', timezone).toISOString();
    const branchQs = branchId ? `&branchId=${branchId}` : '';
    const [pros, appts, branchRows] = await Promise.all([
      apiJson<Professional[]>('/professionals'),
      apiJson<Appointment[]>(
        `/appointments?from=${encodeURIComponent(fromIso)}&to=${encodeURIComponent(toIso)}${branchQs}`,
      ),
      isStaff ? apiJson<Branch[]>('/branches') : Promise.resolve([] as Branch[]),
    ]);
    setProfessionals(pros);
    setAppointments(appts);
    setBranches(branchRows);
    setSelectedPros((current) => {
      const ids = pros.map((row) => row.id);
      if (current.size === 0) {
        return new Set(ids);
      }
      return new Set([...current].filter((id) => ids.includes(id)));
    });
    if (isStaff) {
      const qs = `date=${date}${branchQs}`;
      const [day, now] = await Promise.all([
        apiJson<DailyReport>(`/reports/daily?${qs}`),
        apiJson<LiveReport>(`/reports/live?${qs}`),
      ]);
      setDaily(day);
      setLive(now);
      const resolvedBranch = branchId || me.user.branchId || branchRows[0]?.id;
      if (resolvedBranch) {
        const key = `${date}|${resolvedBranch}`;
        if (noteKeyRef.current !== key) {
          const saved = await apiJson<{ body: string }>(
            `/notes?date=${date}&branchId=${resolvedBranch}`,
          );
          setNote(saved.body);
          noteKeyRef.current = key;
        }
      }
    }
  }, [me, date, view, branchId, timezone, isStaff]);

  useEffect(() => {
    void load().catch((err: Error) => setError(err.message));
  }, [load]);

  const visiblePros = useMemo(() => {
    return professionals.filter((row) => {
      if (selectedPros.size && !selectedPros.has(row.id)) return false;
      if (
        branchId &&
        row.branches &&
        !row.branches.some((item) => item.id === branchId)
      ) {
        return false;
      }
      return true;
    });
  }, [professionals, selectedPros, branchId]);

  const markedDays = useMemo(() => {
    const set = new Set<string>();
    for (const item of appointments) {
      set.add(dateInZone(new Date(item.startAt), timezone));
    }
    return set;
  }, [appointments, timezone]);

  async function saveNote() {
    if (!noteBranch) return;
    await apiJson('/notes', {
      method: 'PUT',
      body: JSON.stringify({ date, branchId: noteBranch, body: note }),
    });
  }

  function openCreate(input: {
    professionalId?: string;
    time?: string;
    date?: string;
  }) {
    if (!canWrite) return;
    if (input.date && input.date !== date) {
      setDate(input.date);
      setView('day');
    }
    setCreate({
      professionalId: input.professionalId,
      time: input.time ?? '10:00',
      date: input.date ?? date,
    });
  }

  if (!me || !date) {
    return (
      <AppShell>
        <p style={{ padding: '1.25rem' }}>Cargando agenda…</p>
      </AppShell>
    );
  }

  const title = formatLongDate(date, timezone);

  return (
    <AppShell>
      <section
        style={{
          padding: '1rem 1.25rem',
          display: 'grid',
          gridTemplateColumns: '240px 1fr auto',
          gap: 16,
          alignItems: 'start',
        }}
      >
        <aside style={{ display: 'grid', gap: 16 }}>
          <MiniCalendar
            date={date}
            timeZone={timezone}
            marked={markedDays}
            onSelect={(iso) => {
              setDate(iso);
              setView('day');
            }}
          />
          {isStaff ? (
            <fieldset
              style={{
                border: '1px solid #eee',
                borderRadius: 12,
                padding: 12,
              }}
            >
              <legend>Colaboradores</legend>
              {professionals.map((pro) => (
                <label key={pro.id} style={{ display: 'block', fontSize: 13 }}>
                  <input
                    type="checkbox"
                    checked={selectedPros.has(pro.id)}
                    onChange={(e) => {
                      const next = new Set(selectedPros);
                      if (e.target.checked) next.add(pro.id);
                      else next.delete(pro.id);
                      setSelectedPros(next);
                    }}
                  />{' '}
                  <span style={{ color: pro.color }}>{pro.displayName}</span>
                </label>
              ))}
            </fieldset>
          ) : null}
          {isStaff && daily ? (
            <div style={{ background: '#fff', borderRadius: 12, padding: 12 }}>
              <h3 style={{ margin: '0 0 8px' }}>El día</h3>
              {live?.inProgress[0] ? (
                <p>
                  En curso: {live.inProgress[0].serviceNameSnapshot} ·{' '}
                  {live.inProgress[0].client.firstName}
                </p>
              ) : live?.next ? (
                <p>
                  Próximo: {formatClock(live.next.startAt, timezone)} ·{' '}
                  {live.next.serviceNameSnapshot}
                </p>
              ) : (
                <p>Sin turnos en curso</p>
              )}
              <p>{daily.count} turnos</p>
              <p>Facturado ${daily.facturado.toLocaleString('es-AR')}</p>
              <p>
                Ticket medio $
                {Math.round(daily.averageTicket).toLocaleString('es-AR')}
              </p>
              <p>Ocupación {daily.occupancyPercent}%</p>
            </div>
          ) : null}
          {isStaff ? (
            <div style={{ background: '#fff', borderRadius: 12, padding: 12 }}>
              <h3 style={{ margin: '0 0 8px' }}>Notas del día</h3>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={4}
                style={{ width: '100%' }}
              />
              <button
                type="button"
                onClick={() =>
                  void saveNote().catch((err: Error) => setError(err.message))
                }
              >
                Guardar nota
              </button>
            </div>
          ) : null}
        </aside>

        <div>
          <header
            style={{
              display: 'flex',
              gap: 8,
              alignItems: 'center',
              flexWrap: 'wrap',
              marginBottom: 12,
            }}
          >
            <h1 style={{ margin: 0, textTransform: 'capitalize' }}>{title}</h1>
            <button
              type="button"
              onClick={() =>
                setDate(
                  addDays(
                    date,
                    view === 'month' ? -30 : view === 'week' ? -7 : -1,
                  ),
                )
              }
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => setDate(todayInZone(timezone))}
            >
              Hoy
            </button>
            <button
              type="button"
              onClick={() =>
                setDate(
                  addDays(
                    date,
                    view === 'month' ? 30 : view === 'week' ? 7 : 1,
                  ),
                )
              }
            >
              ›
            </button>
            {(['day', 'week', 'month'] as AgendaView[]).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setView(item)}
                style={{ fontWeight: view === item ? 700 : 400 }}
              >
                {item === 'day' ? 'Día' : item === 'week' ? 'Semana' : 'Mes'}
              </button>
            ))}
            {isAdmin ? (
              <select
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
              >
                <option value="">Todas las sucursales</option>
                {branches.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
              </select>
            ) : null}
            {canWrite ? (
              <button type="button" onClick={() => openCreate({})}>
                + Nuevo turno
              </button>
            ) : null}
          </header>
          {error ? <p role="alert">{error}</p> : null}
          {view === 'day' ? (
            <DayGrid
              professionals={visiblePros}
              appointments={appointments}
              timeZone={timezone}
              canCreate={canWrite}
              onSelect={setSelected}
              onCreateSlot={(professionalId, time) =>
                openCreate({ professionalId, time, date })
              }
            />
          ) : null}
          {view === 'week' ? (
            <WeekView
              date={date}
              timeZone={timezone}
              professionals={visiblePros}
              appointments={appointments}
              canCreate={canWrite}
              onSelect={setSelected}
              onCreateSlot={(professionalId, day) =>
                openCreate({ professionalId, date: day, time: '10:00' })
              }
              onOpenDay={(day) => {
                setDate(day);
                setView('day');
              }}
            />
          ) : null}
          {view === 'month' ? (
            <MonthView
              date={date}
              timeZone={timezone}
              appointments={appointments}
              onOpenDay={(day) => {
                setDate(day);
                setView('day');
              }}
            />
          ) : null}
        </div>

        {selected ? (
          <AppointmentPanel
            appointment={
              appointments.find((row) => row.id === selected.id) ?? selected
            }
            timeZone={timezone}
            canWrite={canWrite}
            onClose={() => setSelected(null)}
            onChanged={() => {
              void load();
            }}
          />
        ) : (
          <div />
        )}

        {create && canWrite ? (
          <NewAppointmentForm
            date={create.date ?? date}
            timezone={timezone}
            professionals={visiblePros.length ? visiblePros : professionals}
            initialProfessionalId={create.professionalId}
            initialTime={create.time}
            initialBranchId={branchId || undefined}
            onClose={() => setCreate(null)}
            onCreated={() => {
              setCreate(null);
              void load();
            }}
          />
        ) : null}
      </section>
    </AppShell>
  );
}
