import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';
import { withUser } from '../../../shared/db/rls';
import { assemblies, parts, partInstances } from '../../../shared/db/schema';
import { NotFoundError, ValidationError } from '../../../shared/errors';
import { isUuid } from '../../../shared/lib/uuid';
import { StorageService } from '../../../shared/services';
import type { Part, PartInstance, UserContext } from '../types';

export interface ImportInput {
    files: File[];
    assemblyId: string;
    partsQuantity?: number; // アセンブリ1つあたりの必要数。既定 1
}

export interface ImportResult {
    part: Part;
    instance: PartInstance; // 改訂 1 の初期インスタンス
}

export interface ImportPipeline {
    execute(input: ImportInput, ctx: UserContext): Promise<ImportResult[]>;
}

const STL_EXTENSION = /\.stl$/i;

// Supabase Storage はキーに ASCII 以外を許さない場合があるため、保存時のファイル名は ASCII に正規化する。
// 元のファイル名は model_name に残り、ダウンロード時の名前は instance_name から付ける。
export function toStorageSafeName(fileName: string): string {
    const base = fileName.replace(STL_EXTENSION, '').replace(/[^A-Za-z0-9._-]+/g, '_').replace(/^_+|_+$/g, '');
    return `${base || 'model'}.stl`;
}

export class ImportPipelineImpl implements ImportPipeline {
    async execute(input: ImportInput, ctx: UserContext): Promise<ImportResult[]> {
        // 1. 入力検証
        const partsQuantity = input.partsQuantity ?? 1;
        if (input.files.length === 0) {
            throw new ValidationError('At least one file is required');
        }
        if (!Number.isInteger(partsQuantity) || partsQuantity < 1) {
            throw new ValidationError('partsQuantity must be an integer of 1 or more');
        }
        for (const file of input.files) {
            if (!STL_EXTENSION.test(file.name) || file.name.replace(STL_EXTENSION, '').trim() === '') {
                throw new ValidationError(`Not an STL file: ${file.name}`);
            }
        }
        // 他人のアセンブリは RLS により見えないため、存在しない場合と同じ NotFoundError になる
        const assembly = isUuid(input.assemblyId)
            ? await withUser(ctx.userId, (tx) => tx.query.assemblies.findFirst({
                columns: { id: true },
                where: eq(assemblies.id, input.assemblyId),
            }))
            : undefined;
        if (!assembly) {
            throw new NotFoundError(`Assembly not found: ${input.assemblyId}`);
        }

        // 2. ID 採番
        const entries = input.files.map((file) => ({
            file,
            partId: randomUUID(),
            instanceId: randomUUID(),
            modelName: file.name.replace(STL_EXTENSION, ''),
        }));

        // 3. ストレージ保存 (直列)。失敗時は保存済みのファイルを削除する
        const uploadedPaths: string[] = [];
        try {
            const stored: string[] = [];
            for (const entry of entries) {
                const path = await StorageService.uploadFile(
                    entry.file,
                    `${ctx.userId}/parts/${entry.partId}/${toStorageSafeName(entry.file.name)}`,
                );
                uploadedPaths.push(path);
                stored.push(path);
            }

            // 4. DB 登録 (単一トランザクション)。パーツと初期インスタンスは必ず同時に作る
            return await withUser(ctx.userId, async (tx) => {
                const insertedParts = await tx.insert(parts).values(entries.map((entry, i) => ({
                    id: entry.partId,
                    assemblyId: input.assemblyId,
                    modelName: entry.modelName,
                    modelUrl: stored[i],
                    partsQuantity,
                }))).returning();

                const insertedInstances = await tx.insert(partInstances).values(entries.map((entry, i) => ({
                    id: entry.instanceId,
                    partId: entry.partId,
                    revision: 1,
                    instanceName: entry.modelName,
                    instanceUrl: stored[i],
                    changeNote: null,
                }))).returning();

                return entries.map((entry) => ({
                    part: insertedParts.find((p) => p.id === entry.partId)!,
                    instance: insertedInstances.find((p) => p.id === entry.instanceId)!,
                }));
            });
        } catch (error) {
            // 5. 補償処理。削除に失敗したファイルは孤児として残り、定期クリーンアップで回収する
            await this.cleanup(uploadedPaths);
            throw error;
        }
    }

    private async cleanup(paths: string[]): Promise<void> {
        const results = await Promise.allSettled(paths.map((path) => StorageService.deleteFile(path)));
        results.forEach((result, i) => {
            if (result.status === 'rejected') {
                console.error(`Failed to delete orphaned file: ${paths[i]}`, result.reason);
            }
        });
    }
}
