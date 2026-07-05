const { PrismaClient } = require('../dist/generated/prisma')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  // Check if admin already exists
  const existing = await prisma.user.findUnique({
    where: { phone: '+2340000000000' },
  })

  if (existing) {
    console.log('✅ Admin already exists — skipping seed')
    return
  }

  // Create admin — password comes from ADMIN_PASSWORD (set in Railway variables)
  const adminPassword = process.env.ADMIN_PASSWORD || 'AdminPass123!'
  const hash = await bcrypt.hash(adminPassword, 10)
  await prisma.user.create({
    data: {
      phone: '+2340000000000',
      name: 'Fair-Ride Admin',
      role: 'ADMIN',
      status: 'ACTIVE',
      password: hash,
    },
  })
  console.log('✅ Admin user seeded: +2340000000000')

  // Seed default pricing in AppConfig
  const pricing = [
    { key: 'baseFare', value: '500' },
    { key: 'perKmRate', value: '150' },
    { key: 'surgeMultiplier', value: '1.0' },
    { key: 'minimumFare', value: '500' },
  ]

  for (const { key, value } of pricing) {
    await prisma.appConfig.upsert({
      where: { key },
      create: { key, value },
      update: {},
    })
  }
  console.log('✅ Default pricing seeded')
}

main()
  .catch((e) => {
    // Don't crash the server if seed fails — log and continue to boot.
    console.error('❌ Seed error:', e.message)
  })
  .finally(() => prisma.$disconnect())
