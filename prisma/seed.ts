import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.setting.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
}

main().finally(() => prisma.$disconnect());
