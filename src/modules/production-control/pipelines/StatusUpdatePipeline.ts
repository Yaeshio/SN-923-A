import { ItemStatus, ReasonCode, PartItem } from '../types';

export interface StatusUpdateInput {
    itemId: string;
    newStatus: ItemStatus;
    reason_code?: ReasonCode;
    comment?: string;
}

export interface StatusUpdatePipeline {
    execute(input: StatusUpdateInput): Promise<PartItem>;
}

export class StatusUpdatePipelineImpl implements StatusUpdatePipeline {
    async execute(input: StatusUpdateInput): Promise<PartItem> {
        // TDD dummy return
        throw new Error('Not implemented');
    }
}
