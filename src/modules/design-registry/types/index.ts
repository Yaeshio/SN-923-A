import type { assemblies, parts, partInstances } from '../../../shared/db/schema';

export type Assembly = typeof assemblies.$inferSelect;
export type Part = typeof parts.$inferSelect;
export type PartInstance = typeof partInstances.$inferSelect;

// パイプライン・サービスを実行するユーザー。DB アクセスはこのユーザーの RLS で行う。
export interface UserContext {
    userId: string;
}
