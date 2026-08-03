const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const result = await prisma.lead.deleteMany({
    where: {
      OR: [
        { phone: '', email: '' },
        { name: 'Lead', phone: '' },
        { email: { contains: 'sandcloud' } },
        { email: { contains: 'noreply' } },
        { email: { contains: 'no-reply' } }
      ]
    }
  })
  console.log('Cleaned up junk temp leads count:', result.count)
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect())
