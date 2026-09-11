import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import request from 'supertest';
import { AppModule } from '../app.module';
import { configureApp } from '../configure-app';
import { zonedLocalToUtc } from '../common/clock';
import { NotificationsProcessor } from '../notifications/notifications.processor';

const prisma = new PrismaClient();
const PASSWORD = 'Turnero123!';

describe('packs de sesiones (bonos)', () => {
  let app: INestApplication;
  let suffix: string;
  let adminToken: string;
  let branchId: string;
  let professionalId: string;
  let serviceId: string;
  let clientId: string;
  let companyId: string;
  let slug: string;

  beforeAll(async () => {
    suffix = `${Date.now()}`;
    slug = `pack-${suffix}`;
    const email = `admin-${suffix}@turnero.test`;
    const hash = await bcrypt.hash(PASSWORD, 4);
    const company = await prisma.company.create({
      data: {
        name: 'Pack Salon',
        slug,
        contactEmail: email,
        timezone: 'America/Argentina/Buenos_Aires',
        branches: { create: { name: 'Centro' } },
        users: {
          create: {
            email,
            passwordHash: hash,
            firstName: 'Admin',
            lastName: 'Pack',
            role: 'ADMINISTRADOR',
          },
        },
      },
      include: { branches: true },
    });
    companyId = company.id;
    branchId = company.branches[0].id;

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(NotificationsProcessor)
      .useValue({ enqueue: async () => undefined })
      .compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: PASSWORD, companySlug: slug });
    expect(login.status).toBe(200);
    adminToken = login.body.accessToken;

    const proUser = await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: `pro-${suffix}@turnero.test`,
        password: PASSWORD,
        firstName: 'Pro',
        lastName: 'Pack',
        role: 'PROFESIONAL',
      });
    expect(proUser.status).toBe(201);
    professionalId = proUser.body.professionalId;
    expect(professionalId).toBeTruthy();

    await request(app.getHttpServer())
      .put(`/api/v1/professionals/${professionalId}/branches`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ branchIds: [branchId] });

    // weekdayIso: Mon=0 … Sun=6 (2030-01-07 es lunes → 0)
    const schedule = [0, 1, 2, 3, 4, 5].map((weekday) => ({
      weekday,
      branchId,
      startTime: '09:00',
      endTime: '18:00',
    }));
    const scheduleRes = await request(app.getHttpServer())
      .put(`/api/v1/professionals/${professionalId}/schedule`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ blocks: schedule });
    expect(scheduleRes.status).toBe(200);

    const service = await request(app.getHttpServer())
      .post('/api/v1/services')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Depilación axilas',
        durationMinutes: 30,
        basePrice: 8000,
      });
    expect(service.status).toBe(201);
    serviceId = service.body.id;

    await request(app.getHttpServer())
      .put(`/api/v1/professionals/${professionalId}/services`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        items: [
          {
            serviceId,
            remunerationType: 'PERCENT',
            remunerationValue: 40,
          },
        ],
      });

    const client = await request(app.getHttpServer())
      .post('/api/v1/clients')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        firstName: 'Ana',
        lastName: 'Pack',
        phone: `11${String(suffix).slice(-8)}`,
      });
    expect(client.status).toBe(201);
    clientId = client.body.id;
  });

  afterAll(async () => {
    await app?.close();
    if (companyId) {
      await prisma.appointment.deleteMany({ where: { companyId } });
      await prisma.clientPackage.deleteMany({ where: { companyId } });
      await prisma.servicePackage.deleteMany({ where: { companyId } });
      await prisma.professionalService.deleteMany({ where: { companyId } });
      await prisma.workSchedule.deleteMany({ where: { companyId } });
      await prisma.professionalBranch.deleteMany({ where: { companyId } });
      await prisma.professional.deleteMany({ where: { companyId } });
      await prisma.service.deleteMany({ where: { companyId } });
      await prisma.client.deleteMany({ where: { companyId } });
      await prisma.refreshToken.deleteMany({ where: { companyId } });
      await prisma.user.deleteMany({ where: { companyId } });
      await prisma.branch.deleteMany({ where: { companyId } });
      await prisma.company.deleteMany({ where: { id: companyId } });
    }
    await prisma.$disconnect();
  });

  it('vende pack, consume sesión al crear turno y restaura al cancelar', async () => {
    const catalog = await request(app.getHttpServer())
      .post('/api/v1/service-packages')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        serviceId,
        name: 'Pack axilas x6',
        sessionCount: 6,
        price: 40000,
        validityDays: 180,
      });
    expect(catalog.status).toBe(201);
    expect(catalog.body.sessionCount).toBe(6);

    const sold = await request(app.getHttpServer())
      .post(`/api/v1/clients/${clientId}/packages`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ servicePackageId: catalog.body.id });
    expect(sold.status).toBe(201);
    expect(sold.body.remainingSessions).toBe(6);

    const available = await request(app.getHttpServer())
      .get(
        `/api/v1/clients/${clientId}/packages/available?serviceId=${serviceId}`,
      )
      .set('Authorization', `Bearer ${adminToken}`);
    expect(available.status).toBe(200);
    expect(available.body).toHaveLength(1);

    const startAt = zonedLocalToUtc(
      '2030-01-07',
      '10:00',
      'America/Argentina/Buenos_Aires',
    ).toISOString();

    const appointment = await request(app.getHttpServer())
      .post('/api/v1/appointments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        branchId,
        professionalId,
        clientId,
        serviceId,
        startAt,
        clientPackageId: sold.body.id,
      });
    expect(appointment.status).toBe(201);
    expect(appointment.body.price).toBe(0);
    expect(appointment.body.paid).toBe(true);
    expect(appointment.body.sessionNumber).toBe(1);
    expect(appointment.body.clientPackageId).toBe(sold.body.id);

    const afterUse = await request(app.getHttpServer())
      .get(`/api/v1/clients/${clientId}/packages`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(afterUse.body[0].remainingSessions).toBe(5);

    const cancelled = await request(app.getHttpServer())
      .post(`/api/v1/appointments/${appointment.body.id}/cancel`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Cliente avisó' });
    expect([200, 201]).toContain(cancelled.status);

    const restored = await request(app.getHttpServer())
      .get(`/api/v1/clients/${clientId}/packages`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(restored.body[0].remainingSessions).toBe(6);
  });
});
