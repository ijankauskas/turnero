import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import request from 'supertest';
import { AppModule } from '../app.module';
import { HttpErrorFilter } from '../common/http-error.filter';
import { createTenantClient } from '../tenant/create-tenant-client';

const prisma = new PrismaClient();
const PASSWORD = 'Turnero123!';

describe('auth + tenant (AUTH-001 TEN-002)', () => {
  let app: INestApplication;
  let companyA: { id: string; slug: string };
  let companyB: { id: string };
  let adminAEmail: string;
  let sharedEmail: string;
  let suffix: string;

  beforeAll(async () => {
    suffix = `${Date.now()}`;
    const hash = await bcrypt.hash(PASSWORD, 4);
    adminAEmail = `admin-a-${suffix}@turnero.test`;
    sharedEmail = `shared-${suffix}@turnero.test`;

    companyA = await prisma.company.create({
      data: {
        name: 'Empresa A',
        slug: `empresa-a-${suffix}`,
        contactEmail: adminAEmail,
        primaryColor: '#ff00aa',
        branches: { create: { name: 'Suc A' } },
        users: {
          create: [
            {
              email: adminAEmail,
              passwordHash: hash,
              firstName: 'Ada',
              lastName: 'Admin',
              role: 'ADMINISTRADOR',
            },
            {
              email: sharedEmail,
              passwordHash: hash,
              firstName: 'Shared',
              lastName: 'A',
              role: 'ADMINISTRADOR',
            },
            {
              email: `recep-${suffix}@turnero.test`,
              passwordHash: hash,
              firstName: 'Lu',
              lastName: 'Recep',
              role: 'RECEPCION',
            },
            {
              email: `baja-${suffix}@turnero.test`,
              passwordHash: hash,
              firstName: 'Baja',
              lastName: 'User',
              role: 'RECEPCION',
              active: false,
            },
          ],
        },
      },
    });

    companyB = await prisma.company.create({
      data: {
        name: 'Empresa B',
        slug: `empresa-b-${suffix}`,
        contactEmail: `b-${suffix}@turnero.test`,
        primaryColor: '#00aa55',
        users: {
          create: {
            email: sharedEmail,
            passwordHash: hash,
            firstName: 'Shared',
            lastName: 'B',
            role: 'ADMINISTRADOR',
          },
        },
      },
    });

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
  });

  afterAll(async () => {
    await prisma.refreshToken.deleteMany({
      where: { companyId: { in: [companyA.id, companyB.id] } },
    });
    await prisma.user.deleteMany({
      where: { companyId: { in: [companyA.id, companyB.id] } },
    });
    await prisma.branch.deleteMany({
      where: { companyId: { in: [companyA.id, companyB.id] } },
    });
    await prisma.company.deleteMany({
      where: { id: { in: [companyA.id, companyB.id] } },
    });
    await app.close();
    await prisma.$disconnect();
  });

  async function login(email: string, password = PASSWORD, companySlug?: string) {
    return request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password, ...(companySlug ? { companySlug } : {}) });
  }

  it('rejects unknown fields like companyId in the login body (SEC-003)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: adminAEmail,
        password: PASSWORD,
        companyId: companyB.id,
      });
    expect(res.status).toBe(400);
  });

  it('logs in and returns JWT payload with role and companyId (AUTH-001 AUTH-007)', async () => {
    const res = await login(adminAEmail);
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
    const payload = JSON.parse(
      Buffer.from(res.body.accessToken.split('.')[1], 'base64url').toString(),
    ) as Record<string, unknown>;
    expect(payload.sub).toBeDefined();
    expect(payload.companyId).toBe(companyA.id);
    expect(payload.role).toBe('ADMINISTRADOR');
    expect(payload).toHaveProperty('branchId');
    expect(payload).toHaveProperty('professionalId');
  });

  it('GET /auth/me returns branding of the token company', async () => {
    const tokens = await login(adminAEmail);
    const me = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${tokens.body.accessToken}`);
    expect(me.status).toBe(200);
    expect(me.body.company.id).toBe(companyA.id);
    expect(me.body.company.primaryColor).toBe('#ff00aa');
    expect(me.body.user.email).toBe(adminAEmail);
  });

  it('requires companySlug when the same email exists in two companies (TEN-003)', async () => {
    const res = await login(sharedEmail);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('COMPANY_REQUIRED');
    const withSlug = await login(sharedEmail, PASSWORD, companyA.slug);
    expect(withSlug.status).toBe(200);
    const payload = JSON.parse(
      Buffer.from(withSlug.body.accessToken.split('.')[1], 'base64url').toString(),
    ) as { companyId: string };
    expect(payload.companyId).toBe(companyA.id);
  });

  it('does not let an inactive user in (AUTH-008)', async () => {
    const res = await login(`baja-${suffix}@turnero.test`);
    expect(res.status).toBe(401);
    expect(JSON.stringify(res.body)).not.toMatch(/inactivo/i);
  });

  it('uses a generic error for bad credentials (AUTH-005 / UI-006)', async () => {
    const res = await login(adminAEmail, 'wrong-password');
    expect(res.status).toBe(401);
    expect(JSON.stringify(res.body).toLowerCase()).not.toContain('no existe');
  });

  it('rotates refresh tokens and logout revokes them (AUTH-004)', async () => {
    const first = await login(adminAEmail);
    const refreshed = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: first.body.refreshToken });
    expect(refreshed.status).toBe(200);
    expect(refreshed.body.accessToken).toBeDefined();
    const reuse = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: first.body.refreshToken });
    expect(reuse.status).toBe(401);

    await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .send({ refreshToken: refreshed.body.refreshToken });
    const afterLogout = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: refreshed.body.refreshToken });
    expect(afterLogout.status).toBe(401);
  });

  it('forbids RECEPCION from PATCH /company and reports (AUTH-002)', async () => {
    const tokens = await login(`recep-${suffix}@turnero.test`);
    const patch = await request(app.getHttpServer())
      .patch('/api/v1/company')
      .set('Authorization', `Bearer ${tokens.body.accessToken}`)
      .send({ name: 'Hack' });
    expect(patch.status).toBe(403);

    const reports = await request(app.getHttpServer())
      .get('/api/v1/reports/professionals')
      .set('Authorization', `Bearer ${tokens.body.accessToken}`);
    expect(reports.status).toBe(403);
  });

  it('lets admin patch branding of their company only (TEN-001 TEN-004)', async () => {
    const tokens = await login(adminAEmail);
    const patch = await request(app.getHttpServer())
      .patch('/api/v1/company')
      .set('Authorization', `Bearer ${tokens.body.accessToken}`)
      .send({ primaryColor: '#123456', name: 'Empresa A Rosa' });
    expect(patch.status).toBe(200);
    expect(patch.body.primaryColor).toBe('#123456');
    expect(patch.body.id).toBe(companyA.id);

    const other = await prisma.company.findUnique({ where: { id: companyB.id } });
    expect(other?.name).toBe('Empresa B');
  });

  it('TenantPrisma findUnique by id does not cross tenants (TEN-002)', async () => {
    const branchA = await prisma.branch.findFirstOrThrow({
      where: { companyId: companyA.id },
    });
    const branchB = await prisma.branch.create({
      data: { companyId: companyB.id, name: 'Suc B oculta' },
    });
    const tenantA = createTenantClient(prisma, companyA.id);
    const leaked = await tenantA.branch.findUnique({
      where: { id: branchB.id },
    });
    expect(leaked).toBeNull();
    const own = await tenantA.branch.findUnique({
      where: { id: branchA.id },
    });
    expect(own?.id).toBe(branchA.id);
    const listed = await tenantA.branch.findMany();
    expect(listed.every((row) => row.companyId === companyA.id)).toBe(true);
  });
});
