"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@apollo/client/react";
import { gql } from "@apollo/client/core";
import { useParams } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
    Select,
    SelectTrigger,
    SelectContent,
    SelectItem,
    SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import TopStatsSection, { StatItem } from "@/components/dashboard/top-stats-section";
import { Spinner } from "@/components/ui/spinner";
import extractErrorMessage from "@/lib/errors";
import { OrderTrendChart, TrendPoint } from "@/components/dashboard/order-trend-chart";
import TopMenuItemsPieChart from "@/components/dashboard/top-menu-items-pie";

const RESTAURANT_DASHBOARD_QUERY = gql`
    query RestaurantDashboard($restaurantId: ID!, $range: DashboardRangeInput) {
        restaurantDashboardMetrics(restaurantId: $restaurantId, range: $range) {
            range {
                preset
                start
                end
            }
            summary {
                totalRevenue
                totalOrders
                averageOrderValue
                pendingOrders
                completedOrders
            }
            orderTrend {
                date
                orders
                revenue
            }
            topMenuItems {
                menuItemId
                name
                category
                quantity
                revenue
                orders
            }
            recentOrders {
                id
                status
                totalAmount
                customerName
                createdAt
            }
        }
    }
`;

type DashboardRangePreset = "LAST_7_DAYS" | "LAST_30_DAYS" | "LAST_90_DAYS";

type RestaurantDashboardSummary = {
    totalRevenue: number;
    totalOrders: number;
    averageOrderValue: number;
    pendingOrders: number;
    completedOrders: number;
};

type MenuItemPerformance = {
    menuItemId: string;
    name: string;
    category?: string | null;
    quantity: number;
    revenue: number;
    orders: number;
};

type RecentOrder = {
    id: string;
    status: string;
    totalAmount: number;
    customerName: string;
    createdAt: string;
};

type RestaurantDashboardResponse = {
    restaurantDashboardMetrics: {
        range: { preset: string; start: string; end: string };
        summary: RestaurantDashboardSummary;
        orderTrend: TrendPoint[];
        topMenuItems: MenuItemPerformance[];
        recentOrders: RecentOrder[];
    };
};

export default function RestaurantDashboardPage() {
    const params = useParams();
    const restaurantId = params?.id as string;
    const [rangePreset, setRangePreset] = useState<DashboardRangePreset>("LAST_7_DAYS");

    const { data, loading, error, refetch } = useQuery<RestaurantDashboardResponse>(
        RESTAURANT_DASHBOARD_QUERY,
        {
            variables: { restaurantId, range: { preset: rangePreset } },
            skip: !restaurantId,
        },
    );

    useEffect(() => {
        if (error) toast.error(`Unable to load dashboard: ${extractErrorMessage(error)}`);
    }, [error]);

    const metrics = data?.restaurantDashboardMetrics;

    const summaryStats = useMemo(() => {
        const formatter = new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            maximumFractionDigits: 0,
        });
        const summary = metrics?.summary;
        return [
            {
                key: "totalRevenue",
                label: "Total Revenue",
                value: formatter.format(summary?.totalRevenue ?? 0),
                tooltip: "Gross revenue collected from completed payments",
                isLoading: loading && !summary,
            },
            {
                key: "totalOrders",
                label: "Total Orders",
                value: String(summary?.totalOrders ?? "--"),
                tooltip: "Number of orders in the selected range",
                isLoading: loading && !summary,
            },
            {
                key: "averageOrderValue",
                label: "Avg. Order",
                value: formatter.format(Math.round(summary?.averageOrderValue ?? 0)),
                tooltip: "Average ticket size for completed orders",
                isLoading: loading && !summary,
            },
            {
                key: "pendingOrders",
                label: "Pending Orders",
                value: String(summary?.pendingOrders ?? "--"),
                tooltip: "Orders pending fulfillment",
                isLoading: loading && !summary,
            },
        ] as StatItem[];
    }, [metrics?.summary, loading]);

    return (
        <div className="flex h-full flex-col gap-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">Restaurant Dashboard</h1>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <Select
                        value={rangePreset}
                        onValueChange={(value) => setRangePreset(value as DashboardRangePreset)}
                    >
                        <SelectTrigger className="w-40" size="sm">
                            <SelectValue placeholder="Select range" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="LAST_7_DAYS">Last 7 days</SelectItem>
                            <SelectItem value="LAST_30_DAYS">Last 30 days</SelectItem>
                            <SelectItem value="LAST_90_DAYS">Last 3 months</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => refetch()}
                        disabled={loading}
                    >
                        {loading ? <Spinner /> : <RefreshCw className="size-4" />} Refresh
                    </Button>
                </div>
            </div>

            {error && (
                <Alert variant="destructive">
                    <AlertDescription>{extractErrorMessage(error)}</AlertDescription>
                </Alert>
            )}

            <TopStatsSection items={summaryStats} />

            <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-[2fr_1fr]">
                <OrderTrendChart
                    data={metrics?.orderTrend ?? []}
                    loading={loading && !metrics}
                    range={metrics?.range}
                />
                <div className="grid gap-6">
                    {/* Use a Pie chart for top menu items (similar to admin revenue share) */}
                    <TopMenuItemsPieChart
                        data={metrics?.topMenuItems ?? []}
                        loading={loading && !metrics}
                    />
                </div>
            </div>
        </div>
    );
}
