import { db } from "../../../shared/db";
import { boxes } from "../../../shared/db/schema";
import { eq } from "drizzle-orm";

export interface BoxStatusInput {
  id: string;
  status: 'AVAILABLE' | 'OCCUPIED';
}

export class BoxStatusPipelineImpl {
  async execute(input: BoxStatusInput) {
    const [updated] = await db
      .update(boxes)
      .set({ status: input.status })
      .where(eq(boxes.id, input.id))
      .returning();
    return updated;
  }
}
