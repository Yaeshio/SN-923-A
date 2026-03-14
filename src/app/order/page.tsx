import { OrderForm } from "@/modules/production-control/components/OrderForm";

export default function OrderPage() {
    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">製造指示</h1>
                <p className="text-muted-foreground">
                    部品と製造機を指定して、製造個体(PartItem)を発行します。
                </p>
            </div>
            <div className="grid gap-6">
                <OrderForm />
            </div>
        </div>
    );
}
