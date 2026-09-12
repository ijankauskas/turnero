import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

const TENANT_MODELS = new Set<string>([
  'Branch',
  'User',
  'Professional',
  'ProfessionalBranch',
  'WorkSchedule',
  'WorkScheduleException',
  'Service',
  'ProfessionalService',
  'Client',
  'Appointment',
  'Payment',
  'NotificationJob',
  'DailyNote',
  'RefreshToken',
  'ServicePackage',
  'ClientPackage',
]);

function delegateName(model: string): string {
  return model.charAt(0).toLowerCase() + model.slice(1);
}

function withTenantWhere(
  model: string,
  where: Record<string, unknown> | undefined,
  companyId: string,
): Record<string, unknown> {
  if (model === 'Company') {
    return { AND: [where ?? {}, { id: companyId }] };
  }
  if (!TENANT_MODELS.has(model)) {
    return where ?? {};
  }
  return { AND: [where ?? {}, { companyId }] };
}

function stripCompanyId(data: unknown): unknown {
  if (Array.isArray(data)) {
    return data.map(stripCompanyId);
  }
  if (data && typeof data === 'object') {
    const copy = { ...(data as Record<string, unknown>) };
    delete copy.companyId;
    return copy;
  }
  return data;
}

export function createTenantClient(prisma: PrismaClient, companyId: string) {
  return prisma.$extends({
    name: 'tenant',
    query: {
      $allModels: {
        async findMany({ model, args, query }) {
          args.where = withTenantWhere(
            model,
            args.where as Record<string, unknown> | undefined,
            companyId,
          );
          return query(args);
        },
        async findFirst({ model, args, query }) {
          args.where = withTenantWhere(
            model,
            args.where as Record<string, unknown> | undefined,
            companyId,
          );
          return query(args);
        },
        async findFirstOrThrow({ model, args, query }) {
          args.where = withTenantWhere(
            model,
            args.where as Record<string, unknown> | undefined,
            companyId,
          );
          return query(args);
        },
        async count({ model, args, query }) {
          args.where = withTenantWhere(
            model,
            args.where as Record<string, unknown> | undefined,
            companyId,
          );
          return query(args);
        },
        async findUnique({ model, args }) {
          if (model !== 'Company' && !TENANT_MODELS.has(model)) {
            return (prisma as unknown as Record<string, { findUnique: Function }>)[
              delegateName(model)
            ].findUnique(args);
          }
          return (
            prisma as unknown as Record<string, { findFirst: Function }>
          )[delegateName(model)].findFirst({
            ...args,
            where: withTenantWhere(
              model,
              args.where as Record<string, unknown>,
              companyId,
            ),
          });
        },
        async findUniqueOrThrow({ model, args }) {
          const found = await (
            prisma as unknown as Record<string, { findFirst: Function }>
          )[delegateName(model)].findFirst({
            ...args,
            where: withTenantWhere(
              model,
              args.where as Record<string, unknown>,
              companyId,
            ),
          });
          if (!found) {
            throw new NotFoundException();
          }
          return found;
        },
        async create({ model, args, query }) {
          if (model === 'Company') {
            throw new ForbiddenException('No se crea una empresa desde el tenant');
          }
          if (TENANT_MODELS.has(model)) {
            const incoming = args.data as Record<string, unknown>;
            if (
              incoming.companyId &&
              incoming.companyId !== companyId
            ) {
              throw new ForbiddenException('companyId no se toma del body');
            }
            args.data = { ...incoming, companyId } as typeof args.data;
          }
          return query(args);
        },
        async createMany({ model, args, query }) {
          if (TENANT_MODELS.has(model)) {
            const assign = (row: Record<string, unknown>) => {
              if (row.companyId && row.companyId !== companyId) {
                throw new ForbiddenException('companyId no se toma del body');
              }
              return { ...row, companyId };
            };
            const data = args.data as
              | Record<string, unknown>
              | Record<string, unknown>[];
            args.data = (
              Array.isArray(data) ? data.map(assign) : assign(data)
            ) as typeof args.data;
          }
          return query(args);
        },
        async update({ model, args, query }) {
          const found = await (
            prisma as unknown as Record<string, { findFirst: Function }>
          )[delegateName(model)].findFirst({
            where: withTenantWhere(
              model,
              args.where as Record<string, unknown>,
              companyId,
            ),
            select: { id: true },
          });
          if (!found) {
            throw new NotFoundException();
          }
          args.where = { id: found.id } as typeof args.where;
          args.data = stripCompanyId(args.data) as typeof args.data;
          return query(args);
        },
        async updateMany({ model, args, query }) {
          args.where = withTenantWhere(
            model,
            args.where as Record<string, unknown> | undefined,
            companyId,
          );
          args.data = stripCompanyId(args.data) as typeof args.data;
          return query(args);
        },
        async delete({ model, args, query }) {
          const found = await (
            prisma as unknown as Record<string, { findFirst: Function }>
          )[delegateName(model)].findFirst({
            where: withTenantWhere(
              model,
              args.where as Record<string, unknown>,
              companyId,
            ),
            select: { id: true },
          });
          if (!found) {
            throw new NotFoundException();
          }
          args.where = { id: found.id } as typeof args.where;
          return query(args);
        },
        async deleteMany({ model, args, query }) {
          args.where = withTenantWhere(
            model,
            args.where as Record<string, unknown> | undefined,
            companyId,
          );
          return query(args);
        },
      },
    },
  });
}

export type TenantClient = ReturnType<typeof createTenantClient>;

export const PrismaClientKnownRequestError = Prisma.PrismaClientKnownRequestError;
