// orgportal のディレクトリ（メンバー・部門）をサーバー側から取得する。
// WorkPortal はユーザー管理を持たず、orgportal を正本として参照する。

const ORGPORTAL_URL = process.env.ORGPORTAL_URL || 'http://localhost:3100';
const SECRET = process.env.ORG_DIRECTORY_SECRET || '';

type OrgMember = {
  id: string; username: string; name: string; initials: string; email: string | null;
  authType: string; isSuperAdmin: boolean; departmentId: string | null;
  position: string | null; isDirector: boolean; isRepresentative: boolean; isAdvisor: boolean; isAuditor: boolean; active: boolean;
};
type OrgDept = { id: string; name: string; sortOrder: number };

export type WpMember = {
  id: string; username: string; name: string; initials: string; email: string | null;
  authType: string; role: 'admin' | 'member'; departmentId: string | null;
  position: string | null; isDirector: boolean; isRepresentative: boolean; isAdvisor: boolean; isAuditor: boolean; active: boolean;
};

let cache: { at: number; members: WpMember[]; departments: OrgDept[] } | null = null;
const TTL = 30_000; // 30秒キャッシュ

export async function fetchDirectory(): Promise<{ members: WpMember[]; departments: OrgDept[] }> {
  if (cache && Date.now() - cache.at < TTL) return { members: cache.members, departments: cache.departments };
  const res = await fetch(`${ORGPORTAL_URL}/api/directory`, {
    headers: { 'x-directory-secret': SECRET },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('directory fetch failed');
  const data = (await res.json()) as { members: OrgMember[]; departments: OrgDept[] };
  const members: WpMember[] = data.members.map((m) => ({
    id: m.id, username: m.username, name: m.name, initials: m.initials, email: m.email,
    authType: m.authType, role: m.isSuperAdmin ? 'admin' : 'member', departmentId: m.departmentId,
    position: m.position, isDirector: m.isDirector, isRepresentative: m.isRepresentative, isAdvisor: m.isAdvisor, isAuditor: !!m.isAuditor, active: m.active,
  }));
  cache = { at: Date.now(), members, departments: data.departments };
  return { members, departments: data.departments };
}
