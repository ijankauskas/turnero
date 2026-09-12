'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AppShell } from '../../../components/app-shell';
import { apiJson, apiUpload } from '../../../lib/session';
import {
  Alert,
  btnPrimary,
  cardClass,
  cn,
  inputClass,
  labelClass,
  Page,
  PageTitle,
} from '../../../components/ui';

type Company = {
  name: string;
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  contactEmail: string;
  contactPhone: string | null;
  timezone: string;
};

export default function ConfigEmpresaPage() {
  const [row, setRow] = useState<Company | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    void apiJson<Company>('/company')
      .then(setRow)
      .catch((err: Error) => setError(err.message));
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!row) return;
    setSaved(false);
    try {
      const next = await apiJson<Company>('/company', {
        method: 'PATCH',
        body: JSON.stringify({
          name: row.name,
          logoUrl: row.logoUrl || null,
          primaryColor: row.primaryColor,
          secondaryColor: row.secondaryColor,
          contactEmail: row.contactEmail,
          contactPhone: row.contactPhone,
          timezone: row.timezone,
        }),
      });
      setRow(next);
      setSaved(true);
      window.setTimeout(() => window.location.reload(), 400);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function onLogoFile(file: File | null) {
    if (!file || !row) return;
    setUploading(true);
    setError(null);
    try {
      const uploaded = await apiUpload('/uploads/image', file);
      setRow({ ...row, logoUrl: uploaded.url });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
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
        <PageTitle kicker="Branding">Empresa</PageTitle>
        {error ? <Alert>{error}</Alert> : null}
        {saved ? (
          <p className="mb-4 text-sm text-muted">
            Guardado. Actualizando colores…
          </p>
        ) : null}
        {row ? (
          <form
            onSubmit={onSubmit}
            className={cn(cardClass, 'grid max-w-md gap-3 p-5')}
          >
            <label className={labelClass}>
              Nombre
              <input
                value={row.name}
                onChange={(e) => setRow({ ...row, name: e.target.value })}
                className={inputClass}
              />
            </label>
            <div>
              <p className={labelClass}>Logo</p>
              {row.logoUrl ? (
                <img
                  src={row.logoUrl}
                  alt=""
                  className="mb-2 h-14 rounded-lg border border-line bg-white object-contain p-1"
                />
              ) : null}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                disabled={uploading}
                onChange={(e) => void onLogoFile(e.target.files?.[0] ?? null)}
                className="mt-1.5 block w-full text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-canvas file:px-3 file:py-2 file:text-sm file:font-medium file:text-ink"
              />
              <p className="mt-1 text-xs text-muted">
                {uploading ? 'Subiendo…' : 'JPG, PNG o WEBP. Máx. 2 MB.'}
              </p>
            </div>
            <label className={labelClass}>
              Color principal (botones y acentos)
              <input
                type="color"
                value={row.primaryColor || '#2563eb'}
                onChange={(e) =>
                  setRow({ ...row, primaryColor: e.target.value })
                }
                className="mt-1.5 h-10 w-16 cursor-pointer rounded-lg border border-line bg-white"
              />
            </label>
            <label className={labelClass}>
              Color del menú (barra lateral)
              <input
                type="color"
                value={row.secondaryColor || '#0b1220'}
                onChange={(e) =>
                  setRow({ ...row, secondaryColor: e.target.value })
                }
                className="mt-1.5 h-10 w-16 cursor-pointer rounded-lg border border-line bg-white"
              />
            </label>
            <label className={labelClass}>
              Email de contacto
              <input
                type="email"
                value={row.contactEmail}
                onChange={(e) =>
                  setRow({ ...row, contactEmail: e.target.value })
                }
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Teléfono
              <input
                value={row.contactPhone ?? ''}
                onChange={(e) =>
                  setRow({ ...row, contactPhone: e.target.value || null })
                }
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Zona horaria
              <input
                value={row.timezone}
                onChange={(e) => setRow({ ...row, timezone: e.target.value })}
                className={inputClass}
              />
            </label>
            <button type="submit" className={btnPrimary}>
              Guardar
            </button>
          </form>
        ) : null}
      </Page>
    </AppShell>
  );
}
