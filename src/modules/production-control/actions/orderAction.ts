'use server';

import { safeAction } from '../../../shared/actions/safeAction';
import { orderPartsSchema } from './schemas';
import { OrderPipelineImpl } from '../pipelines/OrderPipeline';
import { PartItem } from '../types';

export const createOrderAction = async (input: unknown) => {
    return safeAction(
        orderPartsSchema,
        input,
        async (parsedInput) => {
            const pipeline = new OrderPipelineImpl();
            const result: PartItem[] = await pipeline.execute({
                partId: parsedInput.partId,
                machineId: parsedInput.machineId,
                quantity: parsedInput.quantity,
            });

            return result;
        }
    );
};
