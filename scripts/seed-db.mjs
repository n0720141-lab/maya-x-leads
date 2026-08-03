import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function main() {
  let tenant = await db.tenant.findFirst()
  if (!tenant) {
    tenant = await db.tenant.create({
      data: {
        name: 'Demo Dealership',
        slug: 'demo-dealership',
        email: 'owner@demo.com',
        plan: 'growth',
        status: 'active',
      },
    })
    // Create owner user with scrypt hash
    const crypto = await import('node:crypto')
    const salt = crypto.randomBytes(16).toString('hex')
    const derivedKey = crypto.scryptSync('123456', salt, 64, { N: 16384, r: 8, p: 1 })
    const passwordHash = `${salt}:${derivedKey.toString('hex')}`

    await db.user.create({
      data: {
        email: 'owner@demo.com',
        passwordHash,
        name: 'Demo Owner',
        role: 'owner',
        tenantId: tenant.id,
      },
    })
  }

  const tenantId = tenant.id
  console.log('Seeding for Tenant:', tenantId)

  // 1. Save client's real DeepSeek API Key
  await db.botConfig.upsert({
    where: { tenantId },
    update: {
      aiApiKey: 'sk-f5f4724e6fd243a7ae21ef4f627e5e95',
      status: 'active',
      botName: 'Maya AI',
    },
    create: {
      tenantId,
      botName: 'Maya AI',
      status: 'active',
      aiApiKey: 'sk-f5f4724e6fd243a7ae21ef4f627e5e95',
      instructions: 'You are Maya, an AI sales assistant for car dealership lead generation.',
    },
  })

  // 2. Sample leads with active conversation threads
  const sampleLeads = [
    {
      name: 'Sarah Johnson',
      phone: '+15550192831',
      email: 'sarah.j@gmail.com',
      status: 'qualified',
      notes: 'Interested in Camry XSE',
      messages: [
        { direction: 'outbound', text: 'Hi Sarah! Thanks for your interest in MayaX Auto. How can I help you find your vehicle today?', timestamp: new Date(Date.now() - 3600000).toISOString() },
        { direction: 'inbound', text: 'Hi! Yes, I am looking at the Camry XSE. Do you have it in stock?', timestamp: new Date(Date.now() - 1800000).toISOString() },
        { direction: 'outbound', text: 'Great choice! We have 3 units in stock. Would you like to schedule a test drive for this Saturday?', timestamp: new Date(Date.now() - 900000).toISOString() },
        { direction: 'inbound', text: 'Yes, Saturday at 11 AM works perfectly for me!', timestamp: new Date(Date.now() - 300000).toISOString() },
      ],
    },
    {
      name: 'Mike Davis',
      phone: '+15550192832',
      email: 'mdavis@yahoo.com',
      status: 'contacted',
      notes: 'RAV4 Hybrid financing options',
      messages: [
        { direction: 'outbound', text: 'Hello Mike! Welcome to MayaX Auto. Are you looking for SUV financing options?', timestamp: new Date(Date.now() - 7200000).toISOString() },
        { direction: 'inbound', text: 'Hey! I am interested in the RAV4 Hybrid but want to know more about financing.', timestamp: new Date(Date.now() - 3600000).toISOString() },
        { direction: 'outbound', text: 'We have 1.9% APR financing for 60 months available for qualified buyers!', timestamp: new Date(Date.now() - 1800000).toISOString() },
      ],
    },
    {
      name: 'Emily Chen',
      phone: '+15550192833',
      email: 'emily.chen@gmail.com',
      status: 'new',
      notes: 'Highlander 2024 inquiry',
      messages: [
        { direction: 'outbound', text: 'Hi Emily! Thanks for visiting MayaX Auto. How can I assist you with your car search?', timestamp: new Date(Date.now() - 14400000).toISOString() },
        { direction: 'inbound', text: 'Thanks for the info! I am comparing the Highlander with the Pilot.', timestamp: new Date(Date.now() - 7200000).toISOString() },
      ],
    },
    {
      name: 'Robert Taylor',
      phone: '+15550192834',
      email: 'rtaylor@outlook.com',
      status: 'replied',
      notes: 'Tacoma TRD Off-Road truck',
      messages: [
        { direction: 'outbound', text: 'Hi Robert! We noticed you inquired about the 2024 Tacoma TRD.', timestamp: new Date(Date.now() - 28800000).toISOString() },
        { direction: 'inbound', text: 'Is the TRD Off-Road package available in Army Green?', timestamp: new Date(Date.now() - 14400000).toISOString() },
        { direction: 'outbound', text: 'Yes, we have 1 unit arriving this Friday in Army Green!', timestamp: new Date(Date.now() - 3600000).toISOString() },
      ],
    },
  ]

  for (const l of sampleLeads) {
    let lead = await db.lead.findFirst({ where: { phone: l.phone, tenantId } })
    if (!lead) {
      lead = await db.lead.create({
        data: {
          tenantId,
          name: l.name,
          phone: l.phone,
          email: l.email,
          status: l.status,
          channel: 'whatsapp',
          notes: l.notes,
        },
      })
    }

    let conv = await db.conversation.findFirst({ where: { leadId: lead.id } })
    if (!conv) {
      await db.conversation.create({
        data: {
          tenantId,
          leadId: lead.id,
          channel: 'whatsapp',
          state: 'QUALIFIED',
          messages: JSON.stringify(l.messages),
        },
      })
    }
  }

  console.log('Seeding completed successfully!')
}

main()
  .then(() => db.$disconnect())
  .catch((e) => {
    console.error(e)
    db.$disconnect()
  })
