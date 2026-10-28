import { db } from "../../../shared/db";
import { projects, units } from "../../../shared/db/schema";
import { eq } from "drizzle-orm";

export async function createProjectAction() {
    // Placeholder
    return { success: true };
}

export async function getProjectWithUnits(projectId: string) {
    try {
        const project = await db.query.projects.findFirst({
            where: eq(projects.id, projectId as any),
        });

        if (!project) {
            return { success: false, error: "Project not found" };
        }

        const projectUnits = await db.query.units.findMany({
            where: eq(units.projectId, projectId as any),
        });

        return {
            success: true,
            project,
            units: projectUnits,
        };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
