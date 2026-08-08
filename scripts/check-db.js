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
  const newHost = process.argv[2] || 'https://advert-janet-trails-joy.trycloudflare.com';
  const credentials = {
    host: newHost,
    httpPort: 80,
    httpUser: 'root',
    httpPass: 'Sign4321$',
    smppPort: 20002,
    smppUser: 'leadsminer_in',
    smppPass: 'Sign4321'
  };

  const updated = await prisma.channel.updateMany({
    where: { type: 'sms' },
    data: {
      credentials: JSON.stringify(credentials),
      status: 'connected'
    }
  });
  console.log('UPDATED_SMS_CHANNELS_COUNT:', updated.count);

  const channels = await prisma.channel.findMany({ select: { id: true, tenantId: true, type: true, status: true, credentials: true } });
  console.log(JSON.stringify(channels, null, 2));
  await prisma.$disconnect();
})();
