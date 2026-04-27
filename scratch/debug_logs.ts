import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const workflowId = 'cmofq7lho00zvum7o4torev1o';
  const logs = await prisma.governanceLog.findMany({
    where: { workflowId },
    orderBy: { createdAt: 'asc' }
  });
  console.log('LOGS FOUND:', logs.length);
  console.log(JSON.stringify(logs, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
