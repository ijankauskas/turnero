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
  await upsertProfessional({
    companyId: studio.company.id,
    user: noelia,
    displayName: 'Noelia',
    color: '#E8A0BF',
    branchId: studio.branch.id,
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
