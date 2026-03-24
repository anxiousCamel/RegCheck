import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const lojas = [
  'Rebouças',
  'Ivo Trevisan',
  'Bom Retiro',
  'Hortolândia',
  'Matão',
  'Maria Antônia',
  'Monte Mor',
  'Indaiatuba',
  'Mogi Mirim',
  'Souzas',
  'Taquaral',
  'Mogi Guaçu',
  'Bordon',
];

async function main() {
  console.log('Seeding lojas...');

  for (const nome of lojas) {
    await prisma.loja.upsert({
      where: { nome },
      update: {},
      create: { nome },
    });
  }

  console.log(`Seeded ${lojas.length} lojas.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
