import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function main() {
  const usersCount = await prisma.user.count({
    where: {
      role: 'USER',
    },
  });
  
  const allUsers = await prisma.user.findMany({
    where: {
      role: 'USER',
    },
    take: 10,
    select: {
      id: true,
      name: true,
    }
  });

  const output = {
    totalUsers: usersCount,
    sampleUsers: allUsers,
  };
  
  fs.writeFileSync('tmp/db_result.json', JSON.stringify(output, null, 2));
  console.log('Results written to tmp/db_result.json');
}

main().catch(console.error).finally(() => prisma.$disconnect());
