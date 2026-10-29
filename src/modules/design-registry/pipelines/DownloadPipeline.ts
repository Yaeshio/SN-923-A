import { desc, eq } from 'drizzle-orm';
import { withUser } from '../../../shared/db/rls';
import { partInstances } from '../../../shared/db/schema';
import { NotFoundError } from '../../../shared/errors';
import { isUuid } from '../../../shared/lib/uuid';
import { StorageService } from '../../../shared/services';
import type { UserContext } from '../types';

export interface DownloadInput {
    // part は最新改訂のインスタンスに解決する
    kind: 'partInstance' | 'part';
    id: string;
}

export interface DownloadPipeline {
    execute(input: DownloadInput, ctx: UserContext): Promise<string>;
}

export class DownloadPipelineImpl implements DownloadPipeline {
    async execute(input: DownloadInput, ctx: UserContext): Promise<string> {
        const instance = isUuid(input.id)
            ? await withUser(ctx.userId, (tx) => tx.query.partInstances.findFirst({
                where: input.kind === 'partInstance'
                    ? eq(partInstances.id, input.id)
                    : eq(partInstances.partId, input.id),
                orderBy: desc(partInstances.revision),
            }))
            : undefined;

        // 他人のデータは RLS により見えないため、存在しない場合と同じ NotFoundError になる
        if (!instance) {
            throw new NotFoundError(`${input.kind} not found: ${input.id}`);
        }

        // ダウンロード名は「インスタンス名_rev{N}」とし、拡張子はアップロード時のファイルのものを引き継ぐ
        const extension = instance.instanceUrl.match(/\.[A-Za-z0-9]+$/)?.[0] ?? '';
        const downloadName = `${instance.instanceName}_rev${instance.revision}${extension}`;

        return StorageService.getDownloadUrl(instance.instanceUrl, downloadName);
    }
}
