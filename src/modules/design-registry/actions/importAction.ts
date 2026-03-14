'use server';

import { safeAction } from '@/shared/actions/safeAction';
import { importPartsSchema } from './schemas';
import { ImportPipelineImpl } from '../pipelines/ImportPipeline';
import { Part } from '../types';

export const importPartsAction = async (formData: FormData) => {
    // 1. Manually parse FormData to the object shape expected by zod
    const projectId = formData.get('projectId') as string;
    const unitId = formData.get('unitId') as string;
    const files = formData.getAll('files') as File[];

    const rawInput = {
        projectId,
        unitId,
        files,
    };

    // 2. Validate and Execute with safeAction wrapper
    return safeAction(
        importPartsSchema,
        rawInput,
        async (input) => {
            const pipeline = new ImportPipelineImpl();
            const result: Part[] = await pipeline.execute({
                projectId: input.projectId,
                unitId: input.unitId,
                files: input.files, // Pass File objects
            });

            return result;
        }
    );
};
