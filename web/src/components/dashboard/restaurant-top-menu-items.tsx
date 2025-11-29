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
// Icon removed to keep component minimal — use the legend or other UI for visuals

export type MenuPerformanceItem = {
    menuItemId: string;
    name: string;
    category?: string | null;
    quantity: number;
    revenue: number;
    orders: number;
};

interface Props {
    data?: MenuPerformanceItem[];
    loading?: boolean;
}

export default function TopMenuItemsList({ data = [], loading }: Props) {
    const items = React.useMemo(() => data.slice(0, 5), [data]);

    return (
        <Card className="h-full">
            <CardHeader className="flex items-center gap-2 space-y-0 py-5 text-xl sm:flex-row">
                <div className="grid flex-1 gap-1">
                    <CardTitle>Top Menu Items</CardTitle>
                    <CardDescription>
                        Most popular menu items for the selected range
                    </CardDescription>
                </div>
            </CardHeader>
            <CardContent className="flex-1 py-0">
                {loading ? (
                    <div className="p-4">
                        <Skeleton className="mb-4 h-6 w-32" />
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="flex items-center gap-3 py-2">
                                <Skeleton className="h-4 w-4" />
                                <Skeleton className="h-4 w-1/2" />
                                <Skeleton className="ml-auto h-4 w-12" />
                            </div>
                        ))}
                    </div>
                ) : items.length === 0 ? (
                    <Empty>
                        <EmptyContent>
                            <EmptyHeader>
                                <EmptyTitle>No menu items</EmptyTitle>
                                <EmptyDescription>
                                    Menu item sales in this range will show up here.
                                </EmptyDescription>
                            </EmptyHeader>
                        </EmptyContent>
                    </Empty>
                ) : (
                    <div className="p-4">
                        {items.map((item) => (
                            <div key={item.menuItemId} className="flex items-center gap-3 py-2">
                                <div className="flex-1">
                                    <div className="font-medium">{item.name}</div>
                                    <div className="text-muted-foreground text-xs">
                                        {item.category}
                                    </div>
                                </div>
                                <div className="text-muted-foreground text-sm">
                                    {item.quantity} pcs
                                </div>
                                <div className="font-mono font-medium">
                                    {new Intl.NumberFormat("en-US", {
                                        style: "currency",
                                        currency: "USD",
                                        maximumFractionDigits: 0,
                                    }).format(Math.round(item.revenue))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
