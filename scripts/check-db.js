const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  console.log('=== USERS ===');
  const users = await prisma.user.findMany({ select: { id: true, email: true, name: true, tenantId: true, createdAt: true } });
  console.log(JSON.stringify(users, null, 2));
  console.log('\n=== TENANTS ===');
  const tenants = await prisma.tenant.findMany({ select: { id: true, name: true, email: true, status: true, plan: true } });
  console.log(JSON.stringify(tenants, null, 2));
  console.log('\n=== CHANNELS ===');
  const channels = await prisma.channel.findMany({ select: { id: true, tenantId: true, type: true, status: true, email: true } });
  console.log(JSON.stringify(channels, null, 2));
  await prisma.$disconnect();
})();
