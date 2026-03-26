'use server';

import { safeAction } from '@/shared/actions/safeAction';
import { updateStatusSchema } from './schemas';
import { StatusUpdatePipelineImpl } from '../pipelines/StatusUpdatePipeline';
import { PartItem } from '../types';

export const updateStatusAction = async (input: unknown) => {
    return safeAction(
        updateStatusSchema,
        input,
        async (parsedInput) => {
            const pipeline = new StatusUpdatePipelineImpl();
            const result: PartItem = await pipeline.execute({
                itemId: parsedInput.itemId,
                newStatus: parsedInput.newStatus,
                reason_code: parsedInput.reason_code,
                comment: parsedInput.comment,
            });

            return result;
        }
    );
};
