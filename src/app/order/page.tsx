import { OrderForm } from "@/modules/production-control/components/OrderForm";
import { db } from "@/shared/db";
import { parts, machines, units } from "@/shared/db/schema";
import { asc, eq, inArray } from "drizzle-orm";

export default async function OrderPage({ searchParams }: { searchParams: Promise<{ projectId?: string }> }) {
    const { projectId } = await searchParams;
    let partsWhere = undefined;
    if (projectId) {
        const projectUnits = await db.query.units.findMany({
            where: eq(units.projectId, projectId),
            columns: { id: true }
        });
        const unitIds = projectUnits.map(u => u.id);
        if (unitIds.length > 0) {
            partsWhere = inArray(parts.unitId, unitIds);
        } else {
            // No units, so no parts
            partsWhere = eq(parts.id, '00000000-0000-0000-0000-000000000000');
        }
    }

    const [partsList, machinesList] = await Promise.all([
        db.query.parts.findMany({
            where: partsWhere,
            orderBy: [asc(parts.partNumber)]
        }),
        db.query.machines.findMany({
            orderBy: [asc(machines.name)]
        })
    ]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">製造指示</h1>
                <p className="text-muted-foreground">
                    部品と製造機を指定して、製造個体(PartItem)を発行します。
                </p>
            </div>
            <div className="grid gap-6">
                <OrderForm parts={partsList} machines={machinesList} />
            </div>
        </div>
    );
}
