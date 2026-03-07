import { PartItem } from '../types';

export interface OrderInput {
    partId: string;
    machineId: string;
    quantity: number;
}

export interface OrderPipeline {
    execute(input: OrderInput): Promise<PartItem[]>;
}

export class OrderPipelineImpl implements OrderPipeline {
    async execute(input: OrderInput): Promise<PartItem[]> {
        // TDD dummy return
        throw new Error('Not implemented');
    }
}
