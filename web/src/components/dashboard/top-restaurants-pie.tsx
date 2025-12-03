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
import type { RestaurantPerformance } from "@/components/dashboard/types";
import { TriangleAlert } from "lucide-react";

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

type PieSlice = {
    id: string;
    name: string;
    value: number;
    orders: number;
    fill: string;
};

interface TopRestaurantsPieChartProps {
    data: RestaurantPerformance[];
    loading?: boolean;
}

export function TopRestaurantsPieChart({ data, loading }: TopRestaurantsPieChartProps) {
    const slices = React.useMemo<PieSlice[]>(() => {
        return (data ?? [])
            .slice(0, 5)
            .map((restaurant, index) => ({
                id: restaurant.restaurantId,
                name: restaurant.name,
                value: Number(restaurant.revenue ?? 0),
                orders: restaurant.orders,
                fill: COLORS[index % COLORS.length],
            }))
            .filter((slice) => slice.value > 0);
    }, [data]);

    const chartConfig = React.useMemo(() => {
        const config: ChartConfig = {};
        slices.forEach((slice) => {
            config[slice.name] = {
                label: slice.name,
                color: slice.fill,
            };
        });
        return config;
    }, [slices]);

    return (
        <Card className="h-full min-h-[550px] gap-1">
            <CardHeader className="flex items-center gap-2 space-y-0 py-4 text-xl sm:flex-row">
                <div className="grid flex-1 gap-1">
                    <CardTitle>Revenue Share</CardTitle>
                    <CardDescription>Showing total revenue for the last 7 days</CardDescription>
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
                                <EmptyTitle>No revenue captured</EmptyTitle>
                                <EmptyDescription>
                                    Once restaurants start processing orders you’ll see how revenue
                                    splits here.
                                </EmptyDescription>
                            </EmptyHeader>
                        </EmptyContent>
                    </Empty>
                ) : (
                    <ChartContainer config={chartConfig} className="h-full w-full">
                        <PieChart>
                            <ChartTooltip
                                cursor={false}
                                content={
                                    <ChartTooltipContent
                                        hideLabel
                                        formatter={(value, _name, item) => {
                                            const payload = item?.payload as PieSlice | undefined;
                                            const percent =
                                                typeof item?.payload?.percent === "number"
                                                    ? item?.payload.percent * 100
                                                    : undefined;

                                            return (
                                                <div className="space-y-1 text-sm">
                                                    <div className="flex items-center gap-2">
                                                        <span
                                                            className="h-2 w-2 rounded-full"
                                                            style={{
                                                                backgroundColor: payload?.fill,
                                                            }}
                                                        />
                                                        <div className="font-medium">
                                                            {payload?.name || "Restaurant"}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        {currencyFormatter.format(Number(value))}
                                                    </div>
                                                    {payload && (
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
