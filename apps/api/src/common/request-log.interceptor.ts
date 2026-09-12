import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import type { Response } from 'express';
import { tap } from 'rxjs/operators';
import type { AuthenticatedUser } from '../auth/auth.types';
import type { RequestWithId } from './request-id.middleware';

@Injectable()
export class RequestLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler) {
    const http = context.switchToHttp();
    const req = http.getRequest<RequestWithId & { user?: AuthenticatedUser }>();
    const res = http.getResponse<Response>();
    if (req.path?.includes('/health')) {
      return next.handle();
    }
    const started = Date.now();
    return next.handle().pipe(
      tap({
        next: () => this.write(req, res.statusCode, started),
        error: (err: unknown) => {
          const status =
            err instanceof HttpException ? err.getStatus() : 500;
          this.write(req, status, started);
        },
      }),
    );
  }

  private write(
    req: RequestWithId & { user?: AuthenticatedUser },
    status: number,
    started: number,
  ) {
    this.logger.log(
      JSON.stringify({
        requestId: req.requestId,
        method: req.method,
        path: req.path,
        status,
        ms: Date.now() - started,
        companyId: req.user?.companyId,
        userId: req.user?.id,
        role: req.user?.role,
      }),
    );
  }
}
