import { db } from "../../../shared/db";
import { machines } from "../../../shared/db/schema";
import { eq } from "drizzle-orm";

export interface MachineStatusInput {
  id: string;
  status: 'READY' | 'RUNNING' | 'MAINTENANCE';
}

export class MachineStatusPipelineImpl {
  async execute(input: MachineStatusInput) {
    const [updated] = await db
      .update(machines)
      .set({ status: input.status })
      .where(eq(machines.id, input.id))
      .returning();
    return updated;
  }
}
