import { Inject, Injectable, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { createTenantClient, type TenantClient } from './create-tenant-client';

@Injectable({ scope: Scope.REQUEST })
export class TenantPrismaService {
  readonly client: TenantClient;

  constructor(
    prisma: PrismaService,
    @Inject(REQUEST) request: Request & { user?: AuthenticatedUser },
  ) {
    const companyId = request.user?.companyId;
    if (!companyId) {
      throw new Error('TenantPrismaService requiere un usuario autenticado');
    }
    this.client = createTenantClient(prisma, companyId);
  }
}
