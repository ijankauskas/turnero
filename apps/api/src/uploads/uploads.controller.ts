import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import { mkdirSync, writeFileSync } from 'fs';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { ensureUploadRoot, publicUploadUrl, UPLOAD_ROOT } from './storage';

const ALLOWED = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

@Controller('uploads')
export class UploadsController {
  @Post('image')
  @Roles('ADMINISTRADOR')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 2 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED.has(file.mimetype)) {
          cb(
            new BadRequestException('Solo JPG, PNG, WEBP o GIF') as never,
            false,
          );
          return;
        }
        cb(null, true);
      },
    }),
  )
  upload(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Subí una imagen');
    }
    ensureUploadRoot();
    const dir = join(UPLOAD_ROOT, user.companyId);
    mkdirSync(dir, { recursive: true });
    const fromName = extname(file.originalname).toLowerCase();
    const ext = EXT[file.mimetype] ?? (fromName || '.jpg');
    const filename = `${randomUUID()}${ext}`;
    writeFileSync(join(dir, filename), file.buffer);
    const relative = `${user.companyId}/${filename}`;
    return {
      url: publicUploadUrl(relative),
      path: relative,
    };
  }
}
