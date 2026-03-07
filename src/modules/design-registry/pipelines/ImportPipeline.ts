import { Part, PartStatus } from '../types';

export interface ImportInput {
    files: any[]; // File interface mock
    projectId: string;
    unitId: string;
}

export interface ImportPipeline {
    execute(input: ImportInput): Promise<Part>;
}

export class ImportPipelineImpl implements ImportPipeline {
    async execute(input: ImportInput): Promise<Part> {
        // TDD dummy return
        throw new Error('Not implemented');
    }
}
