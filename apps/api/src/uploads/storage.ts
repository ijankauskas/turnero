import { BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

export const UPLOAD_ROOT =
  process.env.UPLOAD_DIR || join(process.cwd(), 'uploads');

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

export function assertImageFile(file?: Express.Multer.File) {
  if (!file) {
    throw new BadRequestException('Subí una imagen');
  }
  if (!ALLOWED_MIME.has(file.mimetype)) {
    throw new BadRequestException('Solo JPG, PNG, WEBP o GIF');
  }
  if (file.size > 2 * 1024 * 1024) {
    throw new BadRequestException('La imagen no puede superar 2 MB');
  }
}

function extensionForMime(mime: string) {
  switch (mime) {
    case 'image/jpeg':
      return '.jpg';
    case 'image/png':
      return '.png';
    case 'image/webp':
      return '.webp';
    case 'image/gif':
      return '.gif';
    default:
      throw new BadRequestException('Formato de imagen no soportado');
  }
}

export function saveCompanyImage(
  companyId: string,
  kind: 'logo' | 'avatar',
  file: Express.Multer.File,
) {
  assertImageFile(file);
  const dir = join(UPLOAD_ROOT, companyId);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  const filename = `${kind}-${randomUUID()}${extensionForMime(file.mimetype)}`;
  writeFileSync(join(dir, filename), file.buffer);
  const relative = `${companyId}/${filename}`;
  return { relative, url: publicUploadUrl(relative) };
}

export function publicUploadUrl(relativePath: string) {
  const base = (
    process.env.API_PUBLIC_URL ||
    `http://localhost:${process.env.API_PORT ?? 3001}`
  ).replace(/\/$/, '');
  return `${base}/uploads/${relativePath.replace(/^\/+/, '')}`;
}

export const imageUploadOptions = {
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (
    _req: unknown,
    file: Express.Multer.File,
    cb: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      cb(new BadRequestException('Solo JPG, PNG, WEBP o GIF'), false);
      return;
    }
    cb(null, true);
  },
};
