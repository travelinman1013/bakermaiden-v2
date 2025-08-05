// File: prisma/seed.ts

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding...');
  await prisma.recipe.deleteMany(); // Clear existing recipes
  await prisma.recipe.create({
    data: { name: 'HEB Vanilla Quarter Birthday' },
  });
  await prisma.recipe.create({
    data: { name: 'HEB Vanilla Eighth Ash Blue' },
  });
  await prisma.recipe.create({
    data: { name: 'Almond Cupcake' },
  });
  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });