"use client";

import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Line } from "recharts";
import { format, eachDayOfInterval, parseISO } from "date-fns";
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
    ChartConfig,
    ChartContainer,
    ChartLegend,
    ChartLegendContent,
    ChartTooltip,
    ChartTooltipContent,
} from "@/components/ui/chart";

export type TrendPoint = {
    date: string;
    orders: number;
    revenue: number;
};

interface OrderTrendChartProps {
    data: TrendPoint[];
    loading?: boolean;
    range?: {
        start: string;
        end: string;
    };
}

const chartConfig = {
    orders: {
        label: "Orders",
        color: "var(--chart-1)",
    },
    revenue: {
        label: "Revenue",
        color: "var(--chart-2)",
    },
} satisfies ChartConfig;

export function OrderTrendChart({ data, loading, range }: OrderTrendChartProps) {
    const chartData = React.useMemo(() => {
        if (!range)
            return data.map((point) => ({
                date: format(new Date(point.date), "MMM d"),
                orders: point.orders,
                revenue: Number(point.revenue || 0),
            }));

        const start = parseISO(range.start);
        const end = parseISO(range.end);
        const allDates = eachDayOfInterval({ start, end });

        const dataMap = new Map(data.map((point) => [point.date.split("T")[0], point]));

        return allDates.map((date) => {
            const dateStr = date.toISOString().split("T")[0];
            const point = dataMap.get(dateStr);
            return {
                date: format(date, "MMM d"),
                orders: point?.orders ?? 0,
                revenue: Number(point?.revenue ?? 0),
            };
        });
    }, [data, range]);

    return (
        <Card className="h-full">
            <CardHeader className="flex items-center gap-2 space-y-0 py-5 text-xl sm:flex-row">
                <div className="grid flex-1 gap-1">
                    <CardTitle>Orders & Revenue</CardTitle>
                    <CardDescription>
                        Showing total orders and revenue for the last 7 days
                    </CardDescription>
                </div>
            </CardHeader>
            <CardContent className="flex-1">
                {loading ? (
                    <Skeleton className="h-full w-full" />
                ) : chartData.length === 0 ? (
                    <Empty>
                        <EmptyContent>
                            <EmptyHeader>
                                <EmptyTitle>No activity yet</EmptyTitle>
                                <EmptyDescription>
                                    Orders placed during the selected range will show up here.
                                </EmptyDescription>
                            </EmptyHeader>
                        </EmptyContent>
                    </Empty>
                ) : (
                    <ChartContainer config={chartConfig} className="aspect-auto h-full w-full">
                        <AreaChart
                            data={chartData}
                            margin={{ top: 20, right: 0, left: 0, bottom: 10 }}
                        >
                            <defs>
                                <linearGradient id="fillOrders" x1="0" y1="0" x2="0" y2="1">
                                    <stop
                                        offset="5%"
                                        stopColor="var(--color-orders)"
                                        stopOpacity={0.8}
                                    />
                                    <stop
                                        offset="95%"
                                        stopColor="var(--color-orders)"
                                        stopOpacity={0.1}
                                    />
                                </linearGradient>
                                <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
                                    <stop
                                        offset="5%"
                                        stopColor="var(--color-revenue)"
                                        stopOpacity={0.8}
                                    />
                                    <stop
                                        offset="95%"
                                        stopColor="var(--color-revenue)"
                                        stopOpacity={0.1}
                                    />
                                </linearGradient>
                            </defs>
                            <CartesianGrid vertical={false} />
                            <XAxis
                                dataKey="date"
                                tickLine={false}
                                axisLine={false}
                                tickMargin={8}
                                minTickGap={16}
                                tickCount={10}
                                tickFormatter={(value) => {
                                    const date = new Date(value);
                                    return date.toLocaleDateString("en-US", {
                                        month: "short",
                                        day: "numeric",
                                    });
                                }}
                            />
                            <YAxis
                                yAxisId="left"
                                orientation="left"
                                axisLine={false}
                                tickLine={false}
                                tick={false}
                            />
                            <YAxis
                                yAxisId="right"
                                orientation="right"
                                axisLine={false}
                                tickLine={false}
                                tick={false}
                            />
                            <ChartTooltip
                                cursor={false}
                                content={
                                    <ChartTooltipContent
                                        labelFormatter={(value) => {
                                            return new Date(value).toLocaleDateString("en-US", {
                                                month: "short",
                                                day: "numeric",
                                            });
                                        }}
                                        indicator="dot"
                                        formatter={(value, name) => {
                                            const config =
                                                chartConfig[name as keyof typeof chartConfig];
                                            return (
                                                <div className="flex items-center gap-2">
                                                    <span
                                                        className="h-2 w-2 rounded-full"
                                                        style={{ backgroundColor: config?.color }}
                                                    />
                                                    <span>
                                                        {config?.label}:{" "}
                                                        {typeof value === "number"
                                                            ? value.toLocaleString()
                                                            : value}
                                                    </span>
                                                </div>
                                            );
                                        }}
                                    />
                                }
                            />
                            <Area
                                yAxisId="left"
                                dataKey="revenue"
                                type="natural"
                                fill="url(#fillRevenue)"
                                stroke="var(--color-revenue)"
                            />
                            <Area
                                yAxisId="right"
                                dataKey="orders"
                                type="natural"
                                fill="url(#fillOrders)"
                                stroke="var(--color-orders)"
                            />
                            <Line
                                yAxisId="right"
                                dataKey="orders"
                                type="monotone"
                                stroke="var(--color-orders)"
                                strokeWidth={2}
                                dot={false}
                            />
                            <ChartLegend content={<ChartLegendContent />} />
                        </AreaChart>
                    </ChartContainer>
                )}
            </CardContent>
        </Card>
    );
}
