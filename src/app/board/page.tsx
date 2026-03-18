import { db } from "@/shared/db";
import { partItems } from "@/shared/db/schema";
import { StatusBoard } from "@/modules/production-control/components/StatusBoard";
import { desc } from "drizzle-orm";

export const dynamic = 'force-dynamic';

export default async function BoardPage() {
    const items = await db.query.partItems.findMany({
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
