"use client";

import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis, Line } from "recharts";
import { parseISO } from "date-fns";
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
import { TriangleAlert } from "lucide-react";

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
    const currencyFormatter = React.useMemo(() => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            maximumFractionDigits: 0,
        });
    }, []);

    const numberFormatter = React.useMemo(() => new Intl.NumberFormat("en-US"), []);
    const chartData = React.useMemo(() => {
        // Prefer using ISO date strings for the x axis values (UTC midnight) so
        // the chart and tooltip tick formatters can reliably parse them. This
        // avoids timezone-related off-by-one-day errors when iterating ranges.
        if (!range)
            return data.map((point) => ({
                date: new Date(point.date).toISOString(),
                orders: point.orders,
                revenue: Math.round(Number(point.revenue || 0)),
            }));

        const start = parseISO(range.start);
        const end = parseISO(range.end);

        // Build a data map keyed by ISO date (YYYY-MM-DD) produced from the
        // order point date; this key uses UTC and will match the dates we
        // generate below.
        const dataMap = new Map(data.map((point) => [point.date.split("T")[0], point]));

        // Iterate days in UTC to avoid timezone shifting. Use a manual loop so
        // we control how Date objects are mutated in UTC.
        const allDates: Date[] = [];
        const startUTC = new Date(
            Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()),
        );
        const endUTC = new Date(
            Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()),
        );
        for (
            let d = new Date(startUTC);
            d.getTime() <= endUTC.getTime();
            d.setUTCDate(d.getUTCDate() + 1)
        ) {
            allDates.push(new Date(d));
        }

        return allDates.map((date) => {
            const dateStr = date.toISOString().split("T")[0];
            const point = dataMap.get(dateStr);
            return {
                // Use ISO so we can parse reliably; tickFormatter will render
                // a human-friendly label from the ISO value.
                date: `${dateStr}T00:00:00.000Z`,
                orders: point?.orders ?? 0,
                revenue: Math.round(Number(point?.revenue ?? 0)),
            };
        });
    }, [data, range]);

    const xTickFormatter = React.useCallback((value: string | number) => {
        const date = new Date(value as string);
        return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }, []);

    const tooltipLabelFormatter = React.useCallback((value: string | number) => {
        return new Date(value as string).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
        });
    }, []);

    const tooltipValueFormatter = React.useCallback(
        (value: unknown, name?: string | number) => {
            const key = String(name ?? "");
            const numeric = Number(value ?? 0);
            if (key === "revenue") {
                return currencyFormatter.format(Math.round(numeric));
            }
            return numberFormatter.format(Math.round(numeric));
        },
        [currencyFormatter, numberFormatter],
    );

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
                    <Empty className="h-full">
                        <EmptyContent>
                            <EmptyHeader>
                                <TriangleAlert className="text-destructive size-8" />
                                <EmptyTitle>No activity yet</EmptyTitle>
                                <EmptyDescription>
                                    Orders placed during the selected range will show up here.
                                </EmptyDescription>
                            </EmptyHeader>
                        </EmptyContent>
                    </Empty>
                ) : (
                    <ChartContainer config={chartConfig} className="aspect-auto h-full w-full p-0">
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
                                minTickGap={8}
                                interval="preserveStartEnd"
                                tickFormatter={xTickFormatter}
                            />
                            <ChartTooltip
                                cursor={false}
                                content={
                                    <ChartTooltipContent
                                        labelFormatter={tooltipLabelFormatter}
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
                                                        {tooltipValueFormatter(value, name)}
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
