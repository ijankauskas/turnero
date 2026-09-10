const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();
const PASSWORD = 'Turnero123!';

async function upsertCompany({
  name,
  slug,
  contactEmail,
  contactPhone,
  primaryColor,
  secondaryColor,
  branchName,
  branchAddress,
}) {
  const existing = await prisma.company.findUnique({ where: { slug } });
  if (existing) {
    const branch = await prisma.branch.findFirst({
      where: { companyId: existing.id, deletedAt: null },
    });
    return { company: existing, branch };
  }

  const company = await prisma.company.create({
    data: {
      name,
      slug,
      timezone: 'America/Argentina/Buenos_Aires',
      currency: 'ARS',
      locale: 'es-AR',
      contactEmail,
      contactPhone,
      primaryColor,
      secondaryColor,
      branches: {
        create: {
          name: branchName,
          address: branchAddress,
          phone: contactPhone,
        },
      },
    },
    include: { branches: true },
  });

  return { company, branch: company.branches[0] };
}

async function upsertUser({
  companyId,
  branchId,
  email,
  firstName,
  lastName,
  role,
  passwordHash,
  active = true,
}) {
  const existing = await prisma.user.findFirst({
    where: { companyId, email },
  });
  if (existing) {
    return existing;
  }
  return prisma.user.create({
    data: {
      companyId,
      branchId: branchId ?? null,
      email,
      firstName,
      lastName,
      role,
      passwordHash,
      active,
    },
  });
}

async function upsertProfessional({ companyId, user, displayName, color, branchId }) {
  let professional = await prisma.professional.findUnique({
    where: { userId: user.id },
  });
  if (!professional) {
    professional = await prisma.professional.create({
      data: {
        companyId,
        userId: user.id,
        displayName,
        color,
      },
    });
  }
  if (!user.professionalId) {
    await prisma.user.update({
      where: { id: user.id },
      data: { professionalId: professional.id },
    });
  }
  const link = await prisma.professionalBranch.findFirst({
    where: { professionalId: professional.id, branchId },
  });
  if (!link) {
    await prisma.professionalBranch.create({
      data: {
        companyId,
        professionalId: professional.id,
        branchId,
        isPrimary: true,
      },
    });
  }
  return professional;
}

async function upsertService(
  companyId,
  name,
  durationMinutes,
  basePrice,
  openPrice = false,
) {
  const existing = await prisma.service.findFirst({
    where: { companyId, name, deletedAt: null },
  });
  if (existing) {
    if (existing.openPrice !== openPrice) {
      return prisma.service.update({
        where: { id: existing.id },
        data: { openPrice },
      });
    }
    return existing;
  }
  return prisma.service.create({
    data: { companyId, name, durationMinutes, basePrice, openPrice },
  });
}

async function upsertOffer(companyId, professionalId, service, price, type, value) {
  const existing = await prisma.professionalService.findFirst({
    where: { professionalId, serviceId: service.id },
  });
  if (existing) {
    return existing;
  }
  return prisma.professionalService.create({
    data: {
      companyId,
      professionalId,
      serviceId: service.id,
      price,
      remunerationType: type,
      remunerationValue: value,
    },
  });
}

async function upsertWeekSchedule(companyId, professionalId, branchId) {
  const count = await prisma.workSchedule.count({
    where: { professionalId },
  });
  if (count > 0) {
    return;
  }
  const startTime = new Date(Date.UTC(1970, 0, 1, 9, 0, 0));
  const endTime = new Date(Date.UTC(1970, 0, 1, 18, 0, 0));
  for (const weekday of [0, 1, 2, 3, 4, 5]) {
    await prisma.workSchedule.create({
      data: {
        companyId,
        professionalId,
        branchId,
        weekday,
        startTime,
        endTime,
        isOff: false,
      },
    });
  }
}

async function upsertClient(companyId, firstName, lastName, phone, email) {
  const existing = await prisma.client.findFirst({
    where: { companyId, phone, deletedAt: null },
  });
  if (existing) {
    return existing;
  }
  return prisma.client.create({
    data: { companyId, firstName, lastName, phone, email },
  });
}

function todayInAR() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
  }).format(new Date());
}

async function upsertAppointment({
  companyId,
  branchId,
  professionalId,
  clientId,
  service,
  offer,
  createdByUserId,
  hour,
}) {
  const startAt = new Date(`${todayInAR()}T${hour}:00-03:00`);
  const endAt = new Date(startAt.getTime() + service.durationMinutes * 60_000);
  const existing = await prisma.appointment.findFirst({
    where: { professionalId, startAt },
  });
  if (existing) {
    return existing;
  }
  return prisma.appointment.create({
    data: {
      companyId,
      branchId,
      professionalId,
      clientId,
      serviceId: service.id,
      startAt,
      endAt,
      durationMinutes: service.durationMinutes,
      price: offer.price,
      serviceNameSnapshot: service.name,
      remunerationTypeSnapshot: offer.remunerationType,
      remunerationValueSnapshot: offer.remunerationValue,
      status: 'CONFIRMADO',
      createdByUserId,
    },
  });
}

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  const studio = await upsertCompany({
    name: 'Studio Élégance',
    slug: 'studio-elegance',
    contactEmail: 'hola@studioelegance.example',
    contactPhone: '+5491100000000',
    primaryColor: '#1a1a1a',
    secondaryColor: '#f4e9ee',
    branchName: 'Centro',
    branchAddress: 'Av. Ejemplo 100',
  });

  const clinica = await upsertCompany({
    name: 'Clínica Norte',
    slug: 'clinica-norte',
    contactEmail: 'hola@clinicanorte.example',
    contactPhone: '+5491111111111',
    primaryColor: '#0f6b4c',
    secondaryColor: '#e7f5ef',
    branchName: 'Belgrano',
    branchAddress: 'Av. Cabildo 200',
  });

  await upsertUser({
    companyId: studio.company.id,
    email: 'admin@turnero.test',
    firstName: 'Ana',
    lastName: 'Dueña',
    role: 'ADMINISTRADOR',
    passwordHash,
  });

  await upsertUser({
    companyId: clinica.company.id,
    email: 'admin@turnero.test',
    firstName: 'Mario',
    lastName: 'Dueño',
    role: 'ADMINISTRADOR',
    passwordHash,
  });

  await upsertUser({
    companyId: studio.company.id,
    branchId: studio.branch.id,
    email: 'nora@studioelegance.example',
    firstName: 'Nora',
    lastName: 'Encargada',
    role: 'ENCARGADO',
    passwordHash,
  });

  await upsertUser({
    companyId: studio.company.id,
    branchId: studio.branch.id,
    email: 'lucia@studioelegance.example',
    firstName: 'Lucía',
    lastName: 'Recepción',
    role: 'RECEPCION',
    passwordHash,
  });

  await upsertUser({
    companyId: studio.company.id,
    branchId: studio.branch.id,
    email: 'baja@studioelegance.example',
    firstName: 'Baja',
    lastName: 'Usuario',
    role: 'RECEPCION',
    passwordHash,
    active: false,
  });

  const juan = await upsertUser({
    companyId: studio.company.id,
    branchId: studio.branch.id,
    email: 'juan@studioelegance.example',
    firstName: 'Juan',
    lastName: 'Corte',
    role: 'PROFESIONAL',
    passwordHash,
  });
  await upsertProfessional({
    companyId: studio.company.id,
    user: juan,
    displayName: 'Juan',
    color: '#7C6FF7',
    branchId: studio.branch.id,
  });

  const noelia = await upsertUser({
    companyId: studio.company.id,
    branchId: studio.branch.id,
    email: 'noelia@studioelegance.example',
    firstName: 'Noelia',
    lastName: 'Color',
    role: 'PROFESIONAL',
    passwordHash,
  });
  const noeliaPro = await upsertProfessional({
    companyId: studio.company.id,
    user: noelia,
    displayName: 'Noelia',
    color: '#E8A0BF',
    branchId: studio.branch.id,
  });

  const corte = await upsertService(studio.company.id, 'Corte', 45, 12000);
  const color = await upsertService(studio.company.id, 'Color', 90, 25000);
  const unas = await upsertService(studio.company.id, 'Uñas', 30, 0, true);
  const pestanas = await upsertService(studio.company.id, 'Pestañas', 30, 10000);
  const combo = await upsertService(
    studio.company.id,
    'Uñas + Pestañas',
    45,
    15000,
  );

  const juanPro = await prisma.professional.findUnique({
    where: { userId: juan.id },
  });
  await upsertWeekSchedule(
    studio.company.id,
    juanPro.id,
    studio.branch.id,
  );
  await upsertWeekSchedule(
    studio.company.id,
    noeliaPro.id,
    studio.branch.id,
  );

  const juanCorte = await upsertOffer(
    studio.company.id,
    juanPro.id,
    corte,
    12000,
    'PERCENT',
    40,
  );
  await upsertOffer(
    studio.company.id,
    juanPro.id,
    unas,
    0,
    'PERCENT',
    40,
  );
  const noeliaColor = await upsertOffer(
    studio.company.id,
    noeliaPro.id,
    color,
    25000,
    'PERCENT',
    40,
  );
  await upsertOffer(
    studio.company.id,
    noeliaPro.id,
    pestanas,
    10000,
    'FIXED',
    8000,
  );
  await upsertOffer(
    studio.company.id,
    noeliaPro.id,
    combo,
    20000,
    'PERCENT',
    40,
  );

  const clientAna = await upsertClient(
    studio.company.id,
    'Ana',
    'Pérez',
    '1155550001',
    'ana.perez@example.com',
  );
  const clientLuis = await upsertClient(
    studio.company.id,
    'Luis',
    'Gómez',
    '1155550002',
    null,
  );
  const adminStudio = await prisma.user.findFirst({
    where: { companyId: studio.company.id, email: 'admin@turnero.test' },
  });
  await upsertAppointment({
    companyId: studio.company.id,
    branchId: studio.branch.id,
    professionalId: juanPro.id,
    clientId: clientAna.id,
    service: corte,
    offer: juanCorte,
    createdByUserId: adminStudio.id,
    hour: '10:00',
  });
  await upsertAppointment({
    companyId: studio.company.id,
    branchId: studio.branch.id,
    professionalId: noeliaPro.id,
    clientId: clientLuis.id,
    service: color,
    offer: noeliaColor,
    createdByUserId: adminStudio.id,
    hour: '11:00',
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
