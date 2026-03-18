import { OrderForm } from "@/modules/production-control/components/OrderForm";
import { db } from "@/shared/db";
import { parts, machines } from "@/shared/db/schema";
import { asc } from "drizzle-orm";

export default async function OrderPage() {
    const [partsList, machinesList] = await Promise.all([
        db.query.parts.findMany({
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
