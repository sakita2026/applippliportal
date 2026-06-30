import { prisma } from '@/lib/prisma';
import { USERS, type AppUser } from '@/lib/users';
import { fetchDirectory } from '@/lib/directory';

/** サーバー側で扱うメンバー情報（DB 行 or 定数フォールバック） */
export type ServerMember = {
  username: string;
  name: string;
  email: string | null;
  authType: string;
  role: string;
  departmentId: string | null;
  active: boolean;
};

function fromAppUser(u: AppUser): ServerMember {
  return {
    username: u.username,
    name: u.name,
    email: u.email,
    authType: u.authType,
    role: u.role,
    departmentId: u.departmentId,
    active: true,
  };
}

/** ユーザー名でメンバーを取得（DB 優先、無ければ定数フォールバック） */
export async function getMemberByUsername(username: string): Promise<ServerMember | null> {
  try {
    const m = await prisma.member.findUnique({ where: { username } });
    if (m && m.active) {
      return { username: m.username, name: m.name, email: m.email, authType: m.authType, role: m.role, departmentId: m.departmentId, active: m.active };
    }
    if (m && !m.active) return null;
  } catch {
    /* テーブル未作成時は定数にフォールバック */
  }
  const u = USERS.find((x) => x.username === username);
  return u ? fromAppUser(u) : null;
}

/** メール認証ユーザーをメールで取得（DB 優先、無ければ定数フォールバック） */
export async function getMemberByEmail(email: string): Promise<ServerMember | null> {
  const normalized = email.trim().toLowerCase();
  try {
    const list = await prisma.member.findMany({ where: { authType: 'email', active: true } });
    const m = list.find((x) => x.email?.toLowerCase() === normalized);
    if (m) return { username: m.username, name: m.name, email: m.email, authType: m.authType, role: m.role, departmentId: m.departmentId, active: m.active };
  } catch {
    /* フォールバック */
  }
  const u = USERS.find((x) => x.authType === 'email' && x.email?.toLowerCase() === normalized);
  return u ? fromAppUser(u) : null;
}

/** パスワード認証の検証。成功時はメンバーを返す。 */
export async function verifyPassword(username: string, password: string): Promise<ServerMember | null> {
  try {
    const m = await prisma.member.findUnique({ where: { username } });
    if (m && m.active && m.authType === 'password' && m.password === password) {
      return { username: m.username, name: m.name, email: m.email, authType: m.authType, role: m.role, departmentId: m.departmentId, active: m.active };
    }
    if (m) return null; // DB に存在するが不一致
  } catch {
    /* フォールバック */
  }
  const u = USERS.find((x) => x.authType === 'password' && x.username === username && x.password === password);
  return u ? fromAppUser(u) : null;
}

/**
 * システム管理者か。**身分の正は orgportal ディレクトリに一本化**（role==='admin' ＝ orgportal isSuperAdmin）。
 * ローカル prisma.member（影の台帳）には依存しない。ディレクトリ取得失敗時は fail-closed（false）。
 */
export async function isAdminUser(username: string | null | undefined): Promise<boolean> {
  if (!username) return false;
  try {
    const { members } = await fetchDirectory();
    const m = members.find((x) => x.username === username && x.active);
    return m?.role === 'admin';
  } catch {
    return false;
  }
}
