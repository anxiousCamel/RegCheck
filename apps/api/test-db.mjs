import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
try {
  await p.$connect();
  console.log('CONNECTED OK - DATABASE_URL:', process.env.DATABASE_URL);
  await p.$disconnect();
} catch (e) {
  console.error('FAILED:', e.message);
  console.error('DATABASE_URL:', process.env.DATABASE_URL);
}
process.exit(0);
