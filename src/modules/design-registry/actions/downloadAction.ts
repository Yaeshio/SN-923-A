'use server';

import { safeAction } from '@/shared/actions/safeAction';
import { z } from 'zod';
import { DownloadPipelineImpl } from '../pipelines/DownloadPipeline';

const downloadSchema = z.object({
  partId: z.string().min(1, 'Part ID is required'),
});

/**
 * Server Action to get a signed download URL for an STL file.
 */
export const downloadStlAction = async (input: unknown) => {
  return safeAction(
    downloadSchema,
    input,
    async ({ partId }) => {
      const pipeline = new DownloadPipelineImpl();
      const url = await pipeline.execute({ partId });
      return url;
    }
  );
};
