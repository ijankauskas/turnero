import { INestApplication, ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { HttpErrorFilter } from './common/http-error.filter';
import { requestIdMiddleware } from './common/request-id.middleware';
import { RequestLogInterceptor } from './common/request-log.interceptor';

export function configureApp(app: INestApplication) {
  app.use(
    helmet({
      frameguard: { action: 'deny' },
      noSniff: true,
      hsts:
        process.env.NODE_ENV === 'production'
          ? { maxAge: 15552000, includeSubDomains: true }
          : false,
      contentSecurityPolicy: false,
    }),
  );
  app.use(requestIdMiddleware);
  app.setGlobalPrefix('api/v1');
  app.enableCors({
    origin: process.env.WEB_ORIGIN ?? 'http://localhost:3000',
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
