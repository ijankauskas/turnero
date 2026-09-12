import { INestApplication, ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { HttpErrorFilter } from './common/http-error.filter';
import { requestIdMiddleware } from './common/request-id.middleware';
import { RequestLogInterceptor } from './common/request-log.interceptor';
import { ensureUploadRoot, UPLOAD_ROOT } from './uploads/storage';

export function configureApp(app: INestApplication) {
  ensureUploadRoot();
  (app as NestExpressApplication).useStaticAssets(UPLOAD_ROOT, {
    prefix: '/uploads/',
  });
  app.use(
    helmet({
      frameguard: { action: 'deny' },
      noSniff: true,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      hsts:
        process.env.NODE_ENV === 'production'
          ? { maxAge: 15552000, includeSubDomains: true }
          : false,
      contentSecurityPolicy: false,
    }),
  );
  app.use(requestIdMiddleware);
  app.setGlobalPrefix('api/v1');
  const corsOrigins = (process.env.WEB_ORIGIN ?? 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  app.enableCors({
    origin: corsOrigins.length === 1 ? corsOrigins[0] : corsOrigins,
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new HttpErrorFilter());
  app.useGlobalInterceptors(new RequestLogInterceptor());
}
