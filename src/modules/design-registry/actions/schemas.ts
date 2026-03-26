import { z } from 'zod';

export const importPartsSchema = z.object({
  projectId: z.string().min(1, "Project ID is required"),
  unitId: z.string().min(1, "Unit ID is required"),
  // Validation for FormData File objects
  files: z.array(
      z.any() // Simplify for File types to avoid browser specific interfaces in Node
  ).min(1, "At least one file is required"),
});
