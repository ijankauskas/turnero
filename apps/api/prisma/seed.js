const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const slug = 'studio-elegance';
  await prisma.company.upsert({
    where: { slug },
    update: {},
    create: {
      name: 'Studio Élégance',
      slug,
      timezone: 'America/Argentina/Buenos_Aires',
      currency: 'ARS',
      locale: 'es-AR',
      contactEmail: 'hola@studioelegance.example',
      contactPhone: '+5491100000000',
      primaryColor: '#1a1a1a',
      secondaryColor: '#f4e9ee',
      branches: {
        create: {
          name: 'Centro',
          address: 'Av. Ejemplo 100',
          phone: '+5491100000000',
        },
      },
    },
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
