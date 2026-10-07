import 'dotenv/config';
import { randomBytes, scrypt as scryptCallback } from 'node:crypto';
import { promisify } from 'node:util';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

const scrypt = promisify(scryptCallback);

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to run the Prisma seed.');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;

  return `scrypt:${salt}:${derivedKey.toString('hex')}`;
}

async function main() {
  const testUsers = [
    { email: 'admin@corpchat.com', fullName: 'Corp Chat Admin' },
    { email: 'joao@corpchat.com', fullName: 'João Silva' },
  ];

  for (const user of testUsers) {
    const passwordHash = await hashPassword('123456');

    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        fullName: user.fullName,
        passwordHash,
      },
      create: {
        ...user,
        passwordHash,
      },
    });
  }

  console.info(`Seed completed: ${testUsers.length} test users are available.`);
}

main()
  .catch((error: unknown) => {
    console.error('Prisma seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
