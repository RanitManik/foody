"use client";

import * as React from "react";
import { PieChart, Pie } from "recharts";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Empty,
    EmptyContent,
    EmptyHeader,
    EmptyDescription,
    EmptyTitle,
} from "@/components/ui/empty";
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    ChartLegend,
    ChartLegendContent,
    type ChartConfig,
} from "@/components/ui/chart";
import { TriangleAlert } from "lucide-react";

type MenuItemPerformance = {
    menuItemId: string;
    name: string;
    category?: string | null;
    quantity: number;
    revenue: number;
    orders: number;
};

interface Props {
    data?: MenuItemPerformance[];
    loading?: boolean;
}

const COLORS = [
    "var(--chart-1)",
    "var(--chart-2)",
    "var(--chart-3)",
    "var(--chart-4)",
    "var(--chart-5)",
];

const currencyFormatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
});

export default function TopMenuItemsPieChart({ data, loading }: Props) {
    const slices = React.useMemo(() => {
        return (data ?? [])
            .slice(0, 5)
            .map((item, index) => ({
                id: item.menuItemId,
                name: item.name,
                value: Number(item.revenue ?? 0),
                orders: item.orders,
                fill: COLORS[index % COLORS.length],
            }))
            .filter((s) => s.value > 0);
    }, [data]);

    const chartConfig = React.useMemo(() => {
        const cfg: ChartConfig = {};
        for (const slice of slices) {
            cfg[slice.name] = { label: slice.name, color: slice.fill };
        }
        return cfg;
    }, [slices]);

    return (
        <Card className="h-full">
            <CardHeader className="flex items-center gap-2 space-y-0 py-4 text-xl sm:flex-row">
                <div className="grid flex-1 gap-1">
                    <CardTitle>Top Menu Items</CardTitle>
                    <CardDescription>
                        Most popular items by revenue for the selected range
                    </CardDescription>
                </div>
            </CardHeader>
            <CardContent className="flex-1">
                {loading ? (
                    <Skeleton className="h-full w-full" />
                ) : slices.length === 0 ? (
                    <Empty className="h-full">
                        <EmptyContent>
                            <EmptyHeader>
                                <TriangleAlert className="text-destructive size-8" />
                                <EmptyTitle>No data</EmptyTitle>
                                <EmptyDescription>
                                    No menu item revenue captured in this range.
                                </EmptyDescription>
                            </EmptyHeader>
                        </EmptyContent>
                    </Empty>
                ) : (
                    <ChartContainer config={chartConfig} className="h-full w-full p-0">
                        <PieChart>
                            <ChartTooltip
                                cursor={false}
                                content={
                                    <ChartTooltipContent
                                        hideLabel
                                        formatter={(value, _name, item) => {
                                            const payload = item?.payload as unknown as
                                                | {
                                                      orders?: number;
                                                      id?: string;
                                                      percent?: number;
                                                      name?: string;
                                                      fill?: string;
                                                  }
                                                | undefined;
                                            const percent =
                                                typeof payload?.percent === "number"
                                                    ? payload.percent * 100
                                                    : undefined;
                                            return (
                                                <div className="space-y-1 text-sm">
                                                    <div className="flex items-center gap-2">
                                                        <div
                                                            className="h-2 w-2 rounded-full"
                                                            style={{
                                                                backgroundColor:
                                                                    item?.payload?.fill,
                                                            }}
                                                        />
                                                        <div className="font-medium">
                                                            {item?.payload?.name || "Item"}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        {currencyFormatter.format(Number(value))}
                                                    </div>
                                                    {payload?.orders && (
                                                        <p className="text-muted-foreground text-xs">
                                                            {payload.orders.toLocaleString()} orders
                                                            {typeof percent === "number" &&
                                                                ` · ${percent.toFixed(1)}% share`}
                                                        </p>
                                                    )}
                                                </div>
                                            );
                                        }}
                                    />
                                }
                            />
                            <Pie data={slices} dataKey="value" nameKey="name" />
                            <ChartLegend
                                content={<ChartLegendContent nameKey="name" />}
                                className="-translate-y-2 flex-wrap gap-2 *:basis-1/4 *:justify-center"
                            />
                        </PieChart>
                    </ChartContainer>
                )}
            </CardContent>
        </Card>
    );
}
