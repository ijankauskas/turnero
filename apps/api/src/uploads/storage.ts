import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

export const UPLOAD_ROOT =
  process.env.UPLOAD_DIR || join(process.cwd(), 'uploads');

export function ensureUploadRoot() {
  if (!existsSync(UPLOAD_ROOT)) {
    mkdirSync(UPLOAD_ROOT, { recursive: true });
  }
}

export function publicUploadUrl(relativePath: string) {
  const base = (
    process.env.API_PUBLIC_URL ??
    `http://localhost:${process.env.API_PORT ?? 3001}`
  ).replace(/\/$/, '');
  return `${base}/uploads/${relativePath.replace(/^\/+/, '')}`;
}
