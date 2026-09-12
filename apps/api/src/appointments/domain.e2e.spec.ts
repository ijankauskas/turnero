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
    configureApp(app);
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
    await prisma.payment.deleteMany({ where: { companyId } });
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
    expect(all.body.items).toHaveLength(2);
    const mine = await request(app.getHttpServer())
      .get('/api/v1/branches')
      .set('Authorization', `Bearer ${luciaToken}`);
    expect(mine.body.items).toHaveLength(1);
    expect(mine.body.items[0].id).toBe(centroId);
  });

  it('pages directory lists (CLI)', async () => {
    const page = await request(app.getHttpServer())
      .get('/api/v1/clients?page=1&pageSize=1')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(page.status).toBe(200);
    expect(page.body.items).toHaveLength(1);
    expect(page.body.page).toBe(1);
    expect(page.body.pageSize).toBe(1);
    expect(page.body.total).toBeGreaterThanOrEqual(1);
    expect(page.body.pageCount).toBeGreaterThanOrEqual(1);

    const named = await request(app.getHttpServer())
      .get('/api/v1/clients?query=Ana')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(named.status).toBe(200);
    expect(
      named.body.items.every((row: { firstName: string }) =>
        row.firstName.toLowerCase().includes('ana'),
      ),
    ).toBe(true);
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

  it('records Payment, scopes reports and retries email jobs (PAY-001 RPT TEN-005 NTF-006 SEC-003)', async () => {
    const rejected = await request(app.getHttpServer())
      .post('/api/v1/appointments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        companyId,
        branchId: centroId,
        professionalId: juanProId,
        clientId,
        serviceId: corteId,
        startAt: zonedLocalToUtc(
          '2026-09-09',
          '12:00',
          'America/Argentina/Buenos_Aires',
        ).toISOString(),
      });
    expect(rejected.status).toBe(400);

    const startAt = zonedLocalToUtc(
      '2026-09-09',
      '15:00',
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

    const paid = await request(app.getHttpServer())
      .post(`/api/v1/appointments/${created.body.id}/paid`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ paid: true });
    expect(paid.status).toBe(201);
    expect(paid.body.paid).toBe(true);
    const payment = await prisma.payment.findFirst({
      where: { appointmentId: created.body.id },
    });
    expect(payment).toBeTruthy();
    expect(Number(payment?.amount)).toBe(10000);

    const unpaid = await request(app.getHttpServer())
      .post(`/api/v1/appointments/${created.body.id}/paid`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ paid: false });
    expect(unpaid.body.paid).toBe(false);
    const stillPaid = await prisma.payment.findMany({
      where: { appointmentId: created.body.id },
    });
    expect(stillPaid).toHaveLength(1);

    const attended = await request(app.getHttpServer())
      .post(`/api/v1/appointments/${created.body.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'ATENDIDO' });
    expect(attended.status).toBe(201);
    expect(attended.body.status).toBe('ATENDIDO');

    const report = await request(app.getHttpServer())
      .get('/api/v1/reports/professionals?from=2026-09-01&to=2026-09-09')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(report.status).toBe(200);
    expect(report.body.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          professionalId: juanProId,
          turnos: 1,
          facturado: 10000,
          aPagar: 4000,
        }),
      ]),
    );

    const noraOther = await request(app.getHttpServer())
      .get(
        `/api/v1/reports/professionals?from=2026-09-01&to=2026-09-09&branchId=${norteId}`,
      )
      .set('Authorization', `Bearer ${noraToken}`);
    expect(noraOther.status).toBe(403);

    const noraOwn = await request(app.getHttpServer())
      .get('/api/v1/reports/professionals?from=2026-09-01&to=2026-09-09')
      .set('Authorization', `Bearer ${noraToken}`);
    expect(noraOwn.status).toBe(200);
    expect(
      noraOwn.body.items.some(
        (row: { professionalId: string }) => row.professionalId === juanProId,
      ),
    ).toBe(true);

    const silent = await request(app.getHttpServer())
      .post('/api/v1/clients')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        firstName: 'Sin',
        lastName: 'Mail',
        phone: `1100${suffix.slice(-6)}`,
      });
    expect(silent.status).toBe(201);
    const silentAppt = await request(app.getHttpServer())
      .post('/api/v1/appointments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        branchId: centroId,
        professionalId: juanProId,
        clientId: silent.body.id,
        serviceId: corteId,
        startAt: zonedLocalToUtc(
          '2026-09-09',
          '16:00',
          'America/Argentina/Buenos_Aires',
        ).toISOString(),
      });
    expect(silentAppt.status).toBe(201);
    const job = await prisma.notificationJob.create({
      data: {
        companyId,
        appointmentId: silentAppt.body.id,
        channel: 'EMAIL',
        type: 'CREATED',
        status: 'PENDING',
        payload: {},
      },
    });
    const processor = app.get(NotificationsProcessor);
    let row = await prisma.notificationJob.findUniqueOrThrow({
      where: { id: job.id },
    });
    for (let i = 0; i < 5 && row.status === 'PENDING'; i += 1) {
      await processor.processOne(row.id);
      row = await prisma.notificationJob.findUniqueOrThrow({
        where: { id: job.id },
      });
    }
    expect(row.status).toBe('FAILED');
    expect((row.payload as { retries?: number }).retries).toBeGreaterThanOrEqual(
      3,
    );
  });

  it('lets Juan see only his clients and their history (CLI-004)', async () => {
    const exclusive = await request(app.getHttpServer())
      .post('/api/v1/clients')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        firstName: 'Solo',
        lastName: 'Noelia',
        phone: `1188${suffix.slice(-6)}`,
      });
    expect(exclusive.status).toBe(201);
    const booked = await request(app.getHttpServer())
      .post('/api/v1/appointments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        branchId: norteId,
        professionalId: noeliaProId,
        clientId: exclusive.body.id,
        serviceId: corteId,
        startAt: zonedLocalToUtc(
          '2026-09-09',
          '17:00',
          'America/Argentina/Buenos_Aires',
        ).toISOString(),
      });
    expect(booked.status).toBe(201);

    const listed = await request(app.getHttpServer())
      .get('/api/v1/clients')
      .set('Authorization', `Bearer ${juanToken}`);
    expect(listed.status).toBe(200);
    expect(Array.isArray(listed.body.items)).toBe(true);
    expect(
      listed.body.items.every((row: { id: string }) => row.id !== exclusive.body.id),
    ).toBe(true);

    const stolen = await request(app.getHttpServer())
      .get(`/api/v1/clients/${exclusive.body.id}`)
      .set('Authorization', `Bearer ${juanToken}`);
    expect(stolen.status).toBe(404);

    const ficha = await request(app.getHttpServer())
      .get(`/api/v1/clients/${clientId}`)
      .set('Authorization', `Bearer ${juanToken}`);
    expect(ficha.status).toBe(200);
    expect(
      ficha.body.appointments.every(
        (row: { professionalId: string }) => row.professionalId === juanProId,
      ),
    ).toBe(true);
  });

  it('deactivates a professional without deleting past appointments (USR-004)', async () => {
    const off = await request(app.getHttpServer())
      .post(`/api/v1/professionals/${noeliaProId}/deactivate`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(off.status).toBe(201);
    expect(off.body.active).toBe(false);

    const blocked = await request(app.getHttpServer())
      .post('/api/v1/appointments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        branchId: norteId,
        professionalId: noeliaProId,
        clientId,
        serviceId: corteId,
        startAt: zonedLocalToUtc(
          '2026-09-09',
          '18:00',
          'America/Argentina/Buenos_Aires',
        ).toISOString(),
      });
    expect(blocked.status).toBe(400);

    const history = await request(app.getHttpServer())
      .get('/api/v1/appointments?date=2026-09-09')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(
      history.body.some(
        (row: { professionalId: string }) => row.professionalId === noeliaProId,
      ),
    ).toBe(true);
  });

  it('books open-price services and lets recepción set the amount', async () => {
    const unas = await request(app.getHttpServer())
      .post('/api/v1/services')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Uñas abiertas',
        durationMinutes: 45,
        basePrice: 0,
        openPrice: true,
      });
    expect(unas.status).toBe(201);
    expect(unas.body.openPrice).toBe(true);

    const matrix = await request(app.getHttpServer())
      .put(`/api/v1/professionals/${juanProId}/services`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        items: [
          {
            serviceId: corteId,
            remunerationType: 'PERCENT',
            remunerationValue: 40,
          },
          {
            serviceId: unas.body.id,
            remunerationType: 'PERCENT',
            remunerationValue: 40,
          },
        ],
      });
    expect(matrix.status).toBe(200);
    expect(
      matrix.body.find((row: { serviceId: string }) => row.serviceId === unas.body.id)
        .openPrice,
    ).toBe(true);

    const startAt = zonedLocalToUtc(
      '2026-09-10',
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
        serviceId: unas.body.id,
        startAt,
        paid: true,
      });
    expect(created.status).toBe(409);
    expect(created.body.message).toBe(
      'Definí el precio del servicio antes de marcarlo pagado',
    );

    const booked = await request(app.getHttpServer())
      .post('/api/v1/appointments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        branchId: centroId,
        professionalId: juanProId,
        clientId,
        serviceId: unas.body.id,
        startAt,
      });
    expect(booked.status).toBe(201);
    expect(booked.body.price).toBe(0);
    expect(booked.body.pricePending).toBe(true);

    const moved = await request(app.getHttpServer())
      .patch(`/api/v1/appointments/${booked.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        startAt: zonedLocalToUtc(
          '2026-09-10',
          '11:00',
          'America/Argentina/Buenos_Aires',
        ).toISOString(),
      });
    expect(moved.status).toBe(200);
    expect(moved.body.pricePending).toBe(true);
    expect(moved.body.price).toBe(0);

    const paidEarly = await request(app.getHttpServer())
      .post(`/api/v1/appointments/${booked.body.id}/paid`)
      .set('Authorization', `Bearer ${luciaToken}`)
      .send({ paid: true });
    expect(paidEarly.status).toBe(409);

    const juanPrice = await request(app.getHttpServer())
      .post(`/api/v1/appointments/${booked.body.id}/price`)
      .set('Authorization', `Bearer ${juanToken}`)
      .send({ price: 18000 });
    expect(juanPrice.status).toBe(403);

    const attended = await request(app.getHttpServer())
      .post(`/api/v1/appointments/${booked.body.id}/status`)
      .set('Authorization', `Bearer ${luciaToken}`)
      .send({ status: 'ATENDIDO' });
    expect(attended.status).toBe(201);

    const pendingReport = await request(app.getHttpServer())
      .get('/api/v1/reports/professionals?from=2026-09-10&to=2026-09-10')
      .set('Authorization', `Bearer ${adminToken}`);
    const pendingJuan = pendingReport.body.items.find(
      (row: { professionalId: string }) => row.professionalId === juanProId,
    );
    expect(pendingJuan.turnos).toBe(1);
    expect(pendingJuan.facturado).toBe(0);
    expect(pendingJuan.aPagar).toBe(0);

    const priced = await request(app.getHttpServer())
      .post(`/api/v1/appointments/${booked.body.id}/price`)
      .set('Authorization', `Bearer ${luciaToken}`)
      .send({ price: 18000 });
    expect(priced.status).toBe(201);
    expect(priced.body.price).toBe(18000);
    expect(priced.body.pricePending).toBe(false);

    const report = await request(app.getHttpServer())
      .get('/api/v1/reports/professionals?from=2026-09-10&to=2026-09-10')
      .set('Authorization', `Bearer ${adminToken}`);
    const juanRow = report.body.items.find(
      (row: { professionalId: string }) => row.professionalId === juanProId,
    );
    expect(juanRow.facturado).toBe(18000);
    expect(juanRow.aPagar).toBe(7200);

    const paid = await request(app.getHttpServer())
      .post(`/api/v1/appointments/${booked.body.id}/paid`)
      .set('Authorization', `Bearer ${luciaToken}`)
      .send({ paid: true });
    expect(paid.status).toBe(201);
    expect(paid.body.paid).toBe(true);

    const changePaid = await request(app.getHttpServer())
      .post(`/api/v1/appointments/${booked.body.id}/price`)
      .set('Authorization', `Bearer ${luciaToken}`)
      .send({ price: 20000 });
    expect(changePaid.status).toBe(409);
  });

  it('propagates catalog price changes to professional offers (SVC)', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/services')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Brushing', durationMinutes: 30, basePrice: 8000 });
    expect(created.status).toBe(201);

    const assigned = await request(app.getHttpServer())
      .put(`/api/v1/professionals/${juanProId}/services`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        items: [
          {
            serviceId: corteId,
            remunerationType: 'PERCENT',
            remunerationValue: 40,
          },
          {
            serviceId: created.body.id,
            remunerationType: 'PERCENT',
            remunerationValue: 40,
          },
        ],
      });
    expect(assigned.status).toBe(200);
    expect(
      assigned.body.find(
        (row: { serviceId: string }) => row.serviceId === created.body.id,
      ).price,
    ).toBe(8000);

    const patched = await request(app.getHttpServer())
      .patch(`/api/v1/services/${created.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Brushing',
        durationMinutes: 30,
        basePrice: 9500,
        openPrice: false,
      });
    expect(patched.status).toBe(200);
    expect(patched.body.basePrice).toBe(9500);

    const matrix = await request(app.getHttpServer())
      .get(`/api/v1/professionals/${juanProId}/services`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(matrix.status).toBe(200);
    expect(
      matrix.body.find(
        (row: { serviceId: string }) => row.serviceId === created.body.id,
      ).price,
    ).toBe(9500);
    expect(
      matrix.body.find(
        (row: { serviceId: string }) => row.serviceId === corteId,
      ).price,
    ).toBe(10000);
  });
});
