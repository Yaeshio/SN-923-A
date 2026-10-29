'use server';

import { revalidatePath } from 'next/cache';
import { safeAction } from '@/shared/actions/safeAction';
import { requireUser } from '@/shared/auth/requireUser';
import { importPartsSchema } from './schemas';
import { ImportPipelineImpl } from '../pipelines/ImportPipeline';

export const importPartsAction = async (formData: FormData) => {
    // 1. Manually parse FormData to the object shape expected by zod
    const rawInput = {
        assemblyId: formData.get('assemblyId'),
        partsQuantity: formData.get('partsQuantity') || 1,
        // ファイル未選択でも空の File が届くため除外する
        files: (formData.getAll('files') as File[]).filter((file) => file.size > 0),
    };

    // 2. Validate and Execute with safeAction wrapper
    return safeAction(
        importPartsSchema,
        rawInput,
        async (input) => {
            const user = await requireUser();
            const pipeline = new ImportPipelineImpl();
            const result = await pipeline.execute(
                {
                    assemblyId: input.assemblyId,
                    partsQuantity: input.partsQuantity,
                    files: input.files,
                },
                { userId: user.id },
            );

            revalidatePath(`/assemblies/${input.assemblyId}`);
            return result;
        }
    );
};
