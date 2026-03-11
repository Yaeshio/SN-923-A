import { db } from '../../../shared/db';
import { parts } from '../../../shared/db/schema';
import { StorageService } from '../../../shared/services';
import { eq } from 'drizzle-orm';
import { NotFoundError } from '../../../shared/errors';
import { PartStatus } from '../types';

export interface DownloadInput {
    partId: string;
}

export interface DownloadPipeline {
    execute(input: DownloadInput): Promise<string>;
}

export class DownloadPipelineImpl implements DownloadPipeline {
    async execute(input: DownloadInput): Promise<string> {
        const part = await db.query.parts.findFirst({
            where: eq(parts.id, input.partId),
        });

        if (!part || part.status !== PartStatus.ACTIVE) {
            throw new NotFoundError(`Active part not found: ${input.partId}`);
        }

        if (!part.stlUrl) {
            throw new NotFoundError(`STL URL not found for part: ${input.partId}`);
        }

        const url = await StorageService.getDownloadUrl(part.stlUrl);
        return url;
    }
}
