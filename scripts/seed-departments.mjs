// 部門マスタの初期データ投入スクリプト
// 実行: node scripts/seed-departments.mjs
// （DATABASE_URL が必要。Azure SQL のファイアウォールに実行元 IP の許可が必要）

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const DEPARTMENTS = [
  { id: 'sales', name: '営業部', sortOrder: 1 },
  { id: 'dev', name: '開発部', sortOrder: 2 },
  { id: 'general', name: '総務部', sortOrder: 3 },
]

async function main() {
  for (const d of DEPARTMENTS) {
    await prisma.department.upsert({
      where: { id: d.id },
      update: { name: d.name, sortOrder: d.sortOrder },
      create: d,
    })
    console.log(`✓ ${d.name} (${d.id})`)
  }
  console.log('部門マスタの投入が完了しました。')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
