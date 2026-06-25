// 組織（部門 + メンバー）の初期データ投入スクリプト
// 実行: node scripts/seed-org.mjs
// （DATABASE_URL が必要。Azure SQL のファイアウォールに実行元 IP の許可が必要）

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const DEPARTMENTS = [
  { id: 'representative', name: '代表取締役', sortOrder: 1 },
  { id: 'board', name: '取締役', sortOrder: 2 },
  { id: 'management', name: '管理部', sortOrder: 3 },
  { id: 'sales', name: '営業部', sortOrder: 4 },
  { id: 'tech', name: '技術部', sortOrder: 5 },
  { id: 'tech-strategy', name: '技術戦略室', sortOrder: 6 },
]

// 既存の3ユーザーをメンバーへ移行
const MEMBERS = [
  { username: 'admin', name: '管理者', initials: '管', email: null, authType: 'password', password: 'admin', role: 'admin', departmentId: 'management', position: null, isDirector: false, isRepresentative: false },
  { username: 'kanri', name: '山田', initials: '山', email: null, authType: 'password', password: 'kanri', role: 'member', departmentId: 'sales', position: 'staff', isDirector: false, isRepresentative: false },
  { username: 'arita-h', name: '有田', initials: '有', email: 'arita@applippli.co.jp', authType: 'email', password: null, role: 'admin', departmentId: 'management', position: null, isDirector: false, isRepresentative: true },
]

async function main() {
  for (const d of DEPARTMENTS) {
    await prisma.department.upsert({ where: { id: d.id }, update: { name: d.name, sortOrder: d.sortOrder }, create: d })
    console.log(`✓ 部門 ${d.name}`)
  }

  // 旧シードの不要部門を削除（参照が無い場合のみ成功）
  for (const oldId of ['dev', 'general']) {
    try { await prisma.department.delete({ where: { id: oldId } }); console.log(`- 旧部門 ${oldId} を削除`) } catch { /* 無ければ無視 */ }
  }

  for (const m of MEMBERS) {
    await prisma.member.upsert({ where: { username: m.username }, update: m, create: m })
    console.log(`✓ メンバー ${m.name} (@${m.username})`)
  }

  console.log('組織の初期データ投入が完了しました。')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
