"use client";

import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Empty,
    EmptyContent,
    EmptyHeader,
    EmptyDescription,
    EmptyTitle,
} from "@/components/ui/empty";

export type RecentOrder = {
    id: string;
    status: string;
    totalAmount: number;
    customerName: string;
    createdAt: string | Date;
};

interface Props {
    data?: RecentOrder[];
    loading?: boolean;
}

export default function RecentOrdersList({ data = [], loading }: Props) {
    const items = React.useMemo(() => data.slice(0, 5), [data]);

    return (
        <Card className="h-full">
            <CardHeader className="flex items-center gap-2 space-y-0 py-5 text-xl sm:flex-row">
                <div className="grid flex-1 gap-1">
                    <CardTitle>Recent Orders</CardTitle>
                    <CardDescription>Latest orders for this restaurant</CardDescription>
                </div>
            </CardHeader>
            <CardContent className="flex-1 py-0">
                {loading ? (
                    <div className="p-4">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="flex items-center gap-3 py-2">
                                <Skeleton className="h-4 w-10" />
                                <Skeleton className="h-4 w-1/3" />
                                <Skeleton className="ml-auto h-4 w-12" />
                            </div>
                        ))}
                    </div>
                ) : items.length === 0 ? (
                    <Empty>
                        <EmptyContent>
                            <EmptyHeader>
                                <EmptyTitle>No orders yet</EmptyTitle>
                                <EmptyDescription>
                                    Customer orders for this restaurant will appear here.
                                </EmptyDescription>
                            </EmptyHeader>
                        </EmptyContent>
                    </Empty>
                ) : (
                    <div className="p-4">
                        {items.map((order) => (
                            <div key={order.id} className="flex items-center gap-3 py-2">
                                <div className="text-muted-foreground text-sm">
                                    {new Date(order.createdAt).toLocaleDateString()}
                                </div>
                                <div className="flex-1">
                                    <div className="font-medium">{order.customerName}</div>
                                    <div className="text-muted-foreground text-xs">
                                        {order.status}
                                    </div>
                                </div>
                                <div className="font-mono font-medium">
                                    {new Intl.NumberFormat("en-US", {
                                        style: "currency",
                                        currency: "USD",
                                        maximumFractionDigits: 0,
                                    }).format(Math.round(order.totalAmount))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
