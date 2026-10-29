'use server';

import { safeAction } from '@/shared/actions/safeAction';
import { requireUser } from '@/shared/auth/requireUser';
import { downloadSchema } from './schemas';
import { DownloadPipelineImpl } from '../pipelines/DownloadPipeline';

/**
 * Server Action to get a signed download URL for a part instance's STL file.
 */
export const downloadStlAction = async (input: unknown) => {
  return safeAction(
    downloadSchema,
    input,
    async ({ kind, id }) => {
      const user = await requireUser();
      const pipeline = new DownloadPipelineImpl();
      return pipeline.execute({ kind, id }, { userId: user.id });
    }
  );
};
