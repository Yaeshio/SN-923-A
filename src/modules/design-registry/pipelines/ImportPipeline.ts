import { Part, PartStatus } from '../types';
import { db } from '../../../shared/db';
import { parts } from '../../../shared/db/schema';
import { StorageService } from '../../../shared/services';
import { eq, inArray } from 'drizzle-orm';

export interface ImportInput {
    files: any[]; // File interface mock
    projectId: string;
    unitId: string;
}

export interface ImportPipeline {
    execute(input: ImportInput): Promise<Part[]>;
}

export class ImportPipelineImpl implements ImportPipeline {
    async execute(input: ImportInput): Promise<Part[]> {
        // 1. Create PENDING records
        const newParts = input.files.map((file, index) => {
            const fileName = (file as File).name || `PN-${Date.now()}-${index}`;
            const partNumber = fileName.replace(/\.[^/.]+$/, ""); // Strip extension
            
            return {
                unitId: input.unitId,
                partNumber: partNumber,
                status: PartStatus.PENDING,
                stlUrl: '', // To be updated
            };
        });

        const insertedParts = await db.insert(parts).values(newParts).returning();
        const partIds = insertedParts.map(p => p.id);

        try {
            // 2. Upload files in parallel
            const uploadPromises = input.files.map(async (file, index) => {
                const url = await StorageService.uploadFile(file, `parts/${insertedParts[index].id}.stl`);
                
                // Update specific record
                await db.update(parts)
                    .set({ stlUrl: url, status: PartStatus.ACTIVE })
                    .where(eq(parts.id, insertedParts[index].id));
            });

            await Promise.all(uploadPromises);

            // 3. Return final records
            const finalParts = await db.query.parts.findMany({
                where: inArray(parts.id, partIds),
            });

            return finalParts as any[] as Part[];
        } catch (error) {
            // Cleanup: delete PENDING records on failure
            await db.delete(parts).where(inArray(parts.id, partIds));
            throw error;
        }
    }
}
