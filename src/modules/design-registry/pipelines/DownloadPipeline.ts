export interface DownloadInput {
    partId: string;
}

export interface DownloadPipeline {
    execute(input: DownloadInput): Promise<{ url: string }>;
}

export class DownloadPipelineImpl implements DownloadPipeline {
    async execute(input: DownloadInput): Promise<{ url: string }> {
        // TDD dummy return
        throw new Error('Not implemented');
    }
}
