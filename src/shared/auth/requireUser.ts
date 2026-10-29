import { redirect } from 'next/navigation';
import { createClient } from '../lib/supabase/server';
import { UnauthorizedError } from '../errors';

export interface CurrentUser {
    id: string;
    email?: string;
}

/**
 * セッションのユーザーを返す。未ログインなら UnauthorizedError。
 * getSession はクッキーを検証しないため使わず、Auth サーバで検証する getUser を使う。
 */
export async function requireUser(): Promise<CurrentUser> {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
        throw new UnauthorizedError('ログインが必要です');
    }
    return { id: data.user.id, email: data.user.email };
}

/** Server Component 用。未ログインなら /login へリダイレクトする。 */
export async function requireUserOrRedirect(): Promise<CurrentUser> {
    try {
        return await requireUser();
    } catch (error) {
        if (error instanceof UnauthorizedError) {
            redirect('/login');
        }
        throw error;
    }
}
