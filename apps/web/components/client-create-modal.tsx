'use client';

import { FormEvent, useState } from 'react';
import { apiJson } from '../lib/session';
import {
  Alert,
  btnGhost,
  btnPrimary,
  inputClass,
  labelClass,
  Modal,
} from './ui';

export type ClientOption = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string | null;
  active?: boolean;
};

export function ClientCreateModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (client: ClientOption) => void;
}) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [matches, setMatches] = useState<ClientOption[]>([]);
  const [pending, setPending] = useState(false);

  async function save(forceCreate = false) {
    setError(null);
    setPending(true);
    try {
      const created = await apiJson<ClientOption>('/clients', {
        method: 'POST',
        body: JSON.stringify({
          firstName,
          lastName,
          phone,
          email: email || undefined,
          forceCreate,
        }),
      });
      onCreated(created);
      onClose();
    } catch (err) {
      const typed = err as Error & {
        status?: number;
        body?: { matches?: ClientOption[]; error?: string };
      };
      if (typed.status === 409 && typed.body?.error === 'DUPLICATE_PHONE') {
        setMatches(typed.body.matches ?? []);
        setError(
          'Ya hay un cliente con ese teléfono. Elegilo o confirmá si es otra persona.',
        );
        return;
      }
      setError(typed.message);
    } finally {
      setPending(false);
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    await save(false);
  }

  return (
    <Modal title="Nuevo cliente" onClose={onClose}>
      {error ? <div className="mb-3"><Alert>{error}</Alert></div> : null}
      {matches.length > 0 ? (
        <ul className="mb-3 text-sm">
          {matches.map((row) => (
            <li key={row.id}>
              Coincide:{' '}
              <button
                type="button"
                className="underline decoration-line underline-offset-4"
                onClick={() => {
                  onCreated(row);
                  onClose();
                }}
              >
                {row.lastName}, {row.firstName} · {row.phone}
              </button>
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
        <div className="flex flex-wrap gap-2">
          <button type="submit" className={btnPrimary} disabled={pending}>
            Crear
          </button>
          {matches.length > 0 ? (
            <button
              type="button"
              onClick={() => void save(true)}
              className={btnGhost}
              disabled={pending}
            >
              Es otra persona: crear igual
            </button>
          ) : null}
        </div>
      </form>
    </Modal>
  );
}
