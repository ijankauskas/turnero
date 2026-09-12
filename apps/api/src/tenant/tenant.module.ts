import { Global, Module } from '@nestjs/common';
import { TenantPrismaFactory } from './tenant-prisma.service';

@Global()
@Module({
  providers: [TenantPrismaFactory],
  exports: [TenantPrismaFactory],
})
export class TenantModule {}
