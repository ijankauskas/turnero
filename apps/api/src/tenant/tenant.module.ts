import { Module } from '@nestjs/common';
import { TenantPrismaFactory } from './tenant-prisma.service';

@Module({
  providers: [TenantPrismaFactory],
  exports: [TenantPrismaFactory],
})
export class TenantModule {}
