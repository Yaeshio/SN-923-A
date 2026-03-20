import { db } from "@/shared/db";
import { partItems, units, parts } from "@/shared/db/schema";
import { StatusBoard } from "@/modules/production-control/components/StatusBoard";
import { desc, eq, inArray } from "drizzle-orm";

export const dynamic = 'force-dynamic';

export default async function BoardPage({ searchParams }: { searchParams: Promise<{ projectId?: string }> }) {
    const { projectId } = await searchParams;
    let whereClause = undefined;
    
    if (projectId) {
        // Fetch unit IDs for the project
        const projectUnits = await db.query.units.findMany({
            where: eq(units.projectId, projectId),
            columns: { id: true }
        });
        const unitIds = projectUnits.map(u => u.id);
        
        if (unitIds.length > 0) {
            const projectParts = await db.query.parts.findMany({
                where: inArray(parts.unitId, unitIds),
                columns: { id: true }
            });
            const partIds = projectParts.map(p => p.id);
            if (partIds.length > 0) {
                whereClause = inArray(partItems.partId, partIds);
            } else {
                // If there are no parts for this project, return an empty list
                whereClause = eq(partItems.id, '00000000-0000-0000-0000-000000000000');
            }
        } else {
            // If there are no units for this project, return an empty list
            whereClause = eq(partItems.id, '00000000-0000-0000-0000-000000000000');
        }
    }

    const items = await db.query.partItems.findMany({
        where: whereClause,
        with: {
            part: true,
            machine: true,
            box: true,
        },
        orderBy: [desc(partItems.updatedAt)],
        limit: 50
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">工程ボード</h1>
                <p className="text-muted-foreground">
                    各個体の製造ステータスを管理します。
                </p>
            </div>
            <div className="grid gap-6">
                <StatusBoard initialItems={items} />
            </div>
        </div>
    );
}
