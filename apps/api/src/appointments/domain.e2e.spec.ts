import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import request from 'supertest';
import { AppModule } from '../app.module';
import { HttpErrorFilter } from '../common/http-error.filter';
import { zonedLocalToUtc } from '../common/clock';
import { NotificationsProcessor } from '../notifications/notifications.processor';

const prisma = new PrismaClient();
const PASSWORD = 'Turnero123!';

describe('dominio agenda (BRN USR PRO SVC CLI APT AUTH-003)', () => {
  let app: INestApplication;
  let suffix: string;
  let companyId: string;
  let centroId: string;
  let norteId: string;
  let adminToken: string;
  let juanToken: string;
  let noraToken: string;
  let luciaToken: string;
  let juanProId: string;
  let noeliaProId: string;
  let corteId: string;
  let clientId: string;
  let adminEmail: string;

  async function login(email: string, slug = `salon-${suffix}`) {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: PASSWORD, companySlug: slug });
    expect(res.status).toBe(200);
    return res.body.accessToken as string;
  }

  beforeAll(async () => {
    suffix = `${Date.now()}`;
    adminEmail = `dueña-${suffix}@turnero.test`;
    const hash = await bcrypt.hash(PASSWORD, 4);
    const company = await prisma.company.create({
      data: {
        name: 'Salón Test',
        slug: `salon-${suffix}`,
        contactEmail: adminEmail,
        timezone: 'America/Argentina/Buenos_Aires',
        branches: { create: { name: 'Centro' } },
        users: {
          create: {
            email: adminEmail,
            passwordHash: hash,
            firstName: 'Dueña',
            lastName: 'Test',
            role: 'ADMINISTRADOR',
          },
        },
      },
      include: { branches: true, users: true },
    });
    companyId = company.id;
    centroId = company.branches[0].id;

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new HttpErrorFilter());
    await app.init();

    adminToken = await login(adminEmail);
    const norte = await request(app.getHttpServer())
      .post('/api/v1/branches')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Norte' });
    expect(norte.status).toBe(201);
    norteId = norte.body.id;

    const nora = await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: `nora-${suffix}@t.test`,
        password: PASSWORD,
        firstName: 'Nora',
        lastName: 'Encargada',
        role: 'ENCARGADO',
        branchId: centroId,
      });
    expect(nora.status).toBe(201);

    const lucia = await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: `lucia-${suffix}@t.test`,
        password: PASSWORD,
        firstName: 'Lucia',
        lastName: 'Recep',
        role: 'RECEPCION',
        branchId: centroId,
      });
    expect(lucia.status).toBe(201);

    const missingBranch = await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: `x-${suffix}@t.test`,
        password: PASSWORD,
        firstName: 'X',
        lastName: 'Y',
        role: 'ENCARGADO',
      });
    expect(missingBranch.status).toBe(400);

    const juanUser = await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: `juan-${suffix}@t.test`,
        password: PASSWORD,
        firstName: 'Juan',
        lastName: 'Corte',
        role: 'PROFESIONAL',
      });
    const noeliaUser = await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: `noelia-${suffix}@t.test`,
        password: PASSWORD,
        firstName: 'Noelia',
        lastName: 'Color',
        role: 'PROFESIONAL',
      });
    expect(juanUser.body.professionalId).toBeTruthy();
    juanProId = juanUser.body.professionalId;
    noeliaProId = noeliaUser.body.professionalId;

    await request(app.getHttpServer())
      .put(`/api/v1/professionals/${juanProId}/branches`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ branchIds: [centroId] });
    await request(app.getHttpServer())
      .put(`/api/v1/professionals/${noeliaProId}/branches`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ branchIds: [norteId] });

    const schedule = [0, 1, 2, 3, 4, 5].map((weekday) => ({
      weekday,
      branchId: centroId,
      startTime: '09:00',
      endTime: '18:00',
    }));
    await request(app.getHttpServer())
      .put(`/api/v1/professionals/${juanProId}/schedule`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ blocks: schedule });
    await request(app.getHttpServer())
      .put(`/api/v1/professionals/${noeliaProId}/schedule`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        blocks: schedule.map((block) => ({ ...block, branchId: norteId })),
      });

    const overlap = await request(app.getHttpServer())
      .put(`/api/v1/professionals/${juanProId}/schedule`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        blocks: [
          {
            weekday: 2,
            branchId: centroId,
            startTime: '09:00',
            endTime: '18:00',
          },
          {
            weekday: 2,
            branchId: norteId,
            startTime: '09:00',
            endTime: '18:00',
          },
        ],
      });
    expect(overlap.status).toBe(409);

    await request(app.getHttpServer())
      .put(`/api/v1/professionals/${juanProId}/schedule`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ blocks: schedule });

    const corte = await request(app.getHttpServer())
      .post('/api/v1/services')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Corte', durationMinutes: 45, basePrice: 10000 });
    expect(corte.status).toBe(201);
    corteId = corte.body.id;
    await request(app.getHttpServer())
      .put(`/api/v1/professionals/${juanProId}/services`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        items: [
          {
            serviceId: corteId,
            remunerationType: 'PERCENT',
            remunerationValue: 40,
          },
        ],
      });
    await request(app.getHttpServer())
      .put(`/api/v1/professionals/${noeliaProId}/services`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        items: [
          {
            serviceId: corteId,
            remunerationType: 'FIXED',
            remunerationValue: 8000,
          },
        ],
      });

    const client = await request(app.getHttpServer())
      .post('/api/v1/clients')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        firstName: 'Ana',
        lastName: 'Perez',
        phone: '1155559999',
        email: `ana-${suffix}@t.test`,
      });
    expect(client.status).toBe(201);
    clientId = client.body.id;
    const dup = await request(app.getHttpServer())
      .post('/api/v1/clients')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        firstName: 'Ana',
        lastName: 'Otra',
        phone: '1155559999',
      });
    expect(dup.status).toBe(409);
    expect(dup.body.error).toBe('DUPLICATE_PHONE');

    noraToken = await login(`nora-${suffix}@t.test`);
    luciaToken = await login(`lucia-${suffix}@t.test`);
    juanToken = await login(`juan-${suffix}@t.test`);
  });

  afterAll(async () => {
    await prisma.notificationJob.deleteMany({ where: { companyId } });
    await prisma.dailyNote.deleteMany({ where: { companyId } });
    await prisma.appointment.deleteMany({ where: { companyId } });
    await prisma.professionalService.deleteMany({ where: { companyId } });
    await prisma.workSchedule.deleteMany({ where: { companyId } });
    await prisma.professionalBranch.deleteMany({ where: { companyId } });
    await prisma.service.deleteMany({ where: { companyId } });
    await prisma.client.deleteMany({ where: { companyId } });
    await prisma.refreshToken.deleteMany({ where: { companyId } });
    await prisma.professional.deleteMany({ where: { companyId } });
    await prisma.user.deleteMany({ where: { companyId } });
    await prisma.branch.deleteMany({ where: { companyId } });
    await prisma.company.deleteMany({ where: { id: companyId } });
    await app.close();
    await prisma.$disconnect();
  });

  it('filters branches for recepción (BRN-001)', async () => {
    const all = await request(app.getHttpServer())
      .get('/api/v1/branches')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(all.body).toHaveLength(2);
    const mine = await request(app.getHttpServer())
      .get('/api/v1/branches')
      .set('Authorization', `Bearer ${luciaToken}`);
    expect(mine.body).toHaveLength(1);
    expect(mine.body[0].id).toBe(centroId);
  });

  it('creates an appointment and isolates Juan from Noelia (APT AUTH-003)', async () => {
    const startAt = zonedLocalToUtc(
      '2026-09-09',
      '10:00',
      'America/Argentina/Buenos_Aires',
    ).toISOString();
    const created = await request(app.getHttpServer())
      .post('/api/v1/appointments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        branchId: centroId,
        professionalId: juanProId,
        clientId,
        serviceId: corteId,
        startAt,
      });
    expect(created.status).toBe(201);
    expect(created.body.serviceNameSnapshot).toBe('Corte');
    expect(created.body.durationMinutes).toBe(45);

    const overlap = await request(app.getHttpServer())
      .post('/api/v1/appointments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        branchId: centroId,
        professionalId: juanProId,
        clientId,
        serviceId: corteId,
        startAt,
      });
    expect(overlap.status).toBe(409);

    const noeliaStart = zonedLocalToUtc(
      '2026-09-09',
      '11:00',
      'America/Argentina/Buenos_Aires',
    ).toISOString();
    const noeliaAppt = await request(app.getHttpServer())
      .post('/api/v1/appointments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        branchId: norteId,
        professionalId: noeliaProId,
        clientId,
        serviceId: corteId,
        startAt: noeliaStart,
      });
    expect(noeliaAppt.status).toBe(201);

    const juanList = await request(app.getHttpServer())
      .get('/api/v1/appointments?date=2026-09-09')
      .set('Authorization', `Bearer ${juanToken}`);
    expect(juanList.status).toBe(200);
    expect(juanList.body).toHaveLength(1);
    expect(juanList.body[0].professionalId).toBe(juanProId);

    const stolen = await request(app.getHttpServer())
      .get(`/api/v1/appointments/${noeliaAppt.body.id}`)
      .set('Authorization', `Bearer ${juanToken}`);
    expect(stolen.status).toBe(404);

    const noraList = await request(app.getHttpServer())
      .get('/api/v1/appointments?date=2026-09-09')
      .set('Authorization', `Bearer ${noraToken}`);
    expect(
      noraList.body.every((row: { branchId: string }) => row.branchId === centroId),
    ).toBe(true);

    const forbiddenWrite = await request(app.getHttpServer())
      .post('/api/v1/appointments')
      .set('Authorization', `Bearer ${juanToken}`)
      .send({
        branchId: centroId,
        professionalId: juanProId,
        clientId,
        serviceId: corteId,
        startAt: zonedLocalToUtc(
          '2026-09-09',
          '16:00',
          'America/Argentina/Buenos_Aires',
        ).toISOString(),
      });
    expect(forbiddenWrite.status).toBe(403);

    const daily = await request(app.getHttpServer())
      .get(`/api/v1/reports/daily?date=2026-09-09&branchId=${centroId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(daily.status).toBe(200);
    expect(daily.body.count).toBe(1);
    expect(daily.body.scheduledMinutes).toBe(540);
    expect(daily.body.occupancyPercent).toBe(8.3);

    const juanDaily = await request(app.getHttpServer())
      .get('/api/v1/reports/daily?date=2026-09-09')
      .set('Authorization', `Bearer ${juanToken}`);
    expect(juanDaily.status).toBe(403);

    await app.get(NotificationsProcessor).processPending();
    const jobs = await prisma.notificationJob.findMany({
      where: { appointmentId: created.body.id },
    });
    expect(jobs.length).toBeGreaterThan(0);
    expect(jobs.every((job) => job.status === 'SENT')).toBe(true);

    const cancelled = await request(app.getHttpServer())
      .post(`/api/v1/appointments/${created.body.id}/cancel`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'cliente avisó' });
    expect(cancelled.status).toBe(201);
    expect(cancelled.body.status).toBe('CANCELADO');
    const stillThere = await prisma.appointment.findUnique({
      where: { id: created.body.id },
    });
    expect(stillThere).toBeTruthy();

    const wa = await request(app.getHttpServer())
      .get(`/api/v1/appointments/${created.body.id}/whatsapp-link`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(wa.body.url).toContain('wa.me/1155559999');
  });

  it('upserts daily notes scoped by branch (NOTE-001)', async () => {
    const put = await request(app.getHttpServer())
      .put('/api/v1/notes')
      .set('Authorization', `Bearer ${noraToken}`)
      .send({
        date: '2026-09-09',
        branchId: centroId,
        body: 'Caja chica incompleta',
      });
    expect(put.status).toBe(200);
    expect(put.body.body).toBe('Caja chica incompleta');

    const other = await request(app.getHttpServer())
      .put('/api/v1/notes')
      .set('Authorization', `Bearer ${noraToken}`)
      .send({
        date: '2026-09-09',
        branchId: norteId,
        body: 'no',
      });
    expect(other.status).toBe(403);

    const read = await request(app.getHttpServer())
      .get(`/api/v1/notes?date=2026-09-09&branchId=${centroId}`)
      .set('Authorization', `Bearer ${luciaToken}`);
    expect(read.status).toBe(200);
    expect(read.body.body).toBe('Caja chica incompleta');

    const pro = await request(app.getHttpServer())
      .put('/api/v1/notes')
      .set('Authorization', `Bearer ${juanToken}`)
      .send({
        date: '2026-09-09',
        branchId: centroId,
        body: 'no',
      });
    expect(pro.status).toBe(403);
  });

  it('lists availability slots after a cancel (AVL-001)', async () => {
    const avail = await request(app.getHttpServer())
      .get(
        `/api/v1/appointments/availability?professionalId=${juanProId}&branchId=${centroId}&date=2026-09-09&serviceId=${corteId}`,
      )
      .set('Authorization', `Bearer ${adminToken}`);
    expect(avail.status).toBe(200);
    expect(avail.body.durationMinutes).toBe(45);
    expect(avail.body.slots.length).toBeGreaterThan(0);
    const stolen = await request(app.getHttpServer())
      .get(
        `/api/v1/appointments/availability?professionalId=${noeliaProId}&branchId=${norteId}&date=2026-09-09&serviceId=${corteId}`,
      )
      .set('Authorization', `Bearer ${juanToken}`);
    expect(stolen.status).toBe(404);
  });
});
