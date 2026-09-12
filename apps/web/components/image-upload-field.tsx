'use client';

import { useRef, useState } from 'react';
import { btnGhost, cn, labelClass } from './ui';

export function ImageUploadField({
  label,
  imageUrl,
  onFile,
  rounded = 'lg',
  hint = 'JPG, PNG, WEBP o GIF · máx. 2 MB',
}: {
  label: string;
  imageUrl: string | null | undefined;
  onFile: (file: File) => Promise<void>;
  rounded?: 'lg' | 'full';
  hint?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onChange(file: File | undefined) {
    if (!file) return;
    setError(null);
    setPending(true);
    try {
      await onFile(file);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPending(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div>
      <span className={labelClass}>{label}</span>
      <div className="mt-1.5 flex items-center gap-3">
        <div
          className={cn(
            'grid size-16 place-items-center overflow-hidden border border-line bg-canvas',
            rounded === 'full' ? 'rounded-full' : 'rounded-lg',
          )}
        >
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt=""
              className="size-full object-cover"
            />
          ) : (
            <span className="text-xs text-muted">Sin foto</span>
          )}
        </div>
        <div className="min-w-0">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="sr-only"
            onChange={(event) => void onChange(event.target.files?.[0])}
          />
          <button
            type="button"
            className={btnGhost}
            disabled={pending}
            onClick={() => inputRef.current?.click()}
          >
            {pending ? 'Subiendo…' : imageUrl ? 'Cambiar imagen' : 'Subir imagen'}
          </button>
          <p className="mt-1 text-xs text-muted">{hint}</p>
          {error ? <p className="mt-1 text-xs text-red-700">{error}</p> : null}
        </div>
      </div>
    </div>
  );
}
