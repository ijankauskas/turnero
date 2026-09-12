import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { createTenantClient, type TenantClient } from './create-tenant-client';

@Injectable()
export class TenantPrismaFactory {
  constructor(private readonly prisma: PrismaService) {}

  forCompany(companyId: string): TenantClient {
    return createTenantClient(this.prisma, companyId);
  }
}
