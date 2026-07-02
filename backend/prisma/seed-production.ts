import { PrismaClient } from '../generated/prisma'
import * as bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  const adminPhone = process.env['ADMIN_PHONE'] ?? '+2340000000000'
  const adminPassword = process.env['ADMIN_PASSWORD'] ?? 'ChangeThisPassword123!'

  const existing = await prisma.user.findUnique({ where: { phone: adminPhone } })
  if (!existing) {
    const hashedPassword = await bcrypt.hash(adminPassword, 10)
    await prisma.user.create({
      data: {
        phone: adminPhone,
        name: 'Fair-Ride Admin',
        role: 'ADMIN' as any,
        status: 'ACTIVE' as any,
        password: hashedPassword,
      },
    })
    process.stdout.write(`✅ Admin user created: ${adminPhone}\n`)
  } else {
    process.stdout.write(`✅ Admin user already exists: ${adminPhone}\n`)
  }

  const pricingDefaults = [
    { key: 'baseFare', value: '500' },
    { key: 'perKmRate', value: '150' },
    { key: 'surgeMultiplier', value: '1.0' },
    { key: 'minimumFare', value: '500' },
  ]

  for (const { key, value } of pricingDefaults) {
    await (prisma as any).appConfig.upsert({
      where: { key },
      create: { key, value },
      update: {},
    })
  }
  process.stdout.write('✅ Default pricing seeded\n')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
