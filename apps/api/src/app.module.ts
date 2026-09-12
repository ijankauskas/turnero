import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AppointmentsModule } from './appointments/appointments.module';
import { AuthModule } from './auth/auth.module';
import { BranchesModule } from './branches/branches.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { ClientsModule } from './clients/clients.module';
import { CompanyModule } from './company/company.module';
import { HealthModule } from './health/health.module';
import { NotesModule } from './notes/notes.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProfessionalsModule } from './professionals/professionals.module';
import { ReportsModule } from './reports/reports.module';
import { ServicesModule } from './services/services.module';
import { TenantModule } from './tenant/tenant.module';
import { UploadsModule } from './uploads/uploads.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    PrismaModule,
    TenantModule,
    AuthModule,
    CompanyModule,
    BranchesModule,
    UsersModule,
    ProfessionalsModule,
    ServicesModule,
    ClientsModule,
    AppointmentsModule,
    ReportsModule,
    NotesModule,
    NotificationsModule,
    UploadsModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
