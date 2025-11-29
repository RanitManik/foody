"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@apollo/client/react";
import { gql } from "@apollo/client/core";
// format not used after redesign
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
import { OrderTrendChart, TrendPoint } from "@/components/dashboard/order-trend-chart";
import { TopRestaurantsPieChart } from "@/components/dashboard/top-restaurants-pie";
import type { RestaurantPerformance } from "@/components/dashboard/types";
import { Spinner } from "@/components/ui/spinner";
import extractErrorMessage from "@/lib/errors";
import TopStatsSection, { StatItem } from "@/components/dashboard/top-stats-section";

const ADMIN_DASHBOARD_QUERY = gql`
    query AdminDashboard($range: DashboardRangeInput) {
        adminDashboardMetrics(range: $range) {
            range {
                preset
                start
                end
            }
            kpis {
                key
                label
                value
                unit
            }
            orderTrend {
                date
                orders
                revenue
            }
            topRestaurants {
                restaurantId
                name
                city
                location
                orders
                revenue
                averageOrderValue
            }
        }
    }
`;

type DashboardRangePreset = "TODAY" | "LAST_7_DAYS" | "LAST_30_DAYS" | "LAST_90_DAYS";

type DashboardMetric = {
    key: string;
    label: string;
    value: number;
    unit?: string | null;
};

type AdminDashboardResponse = {
    adminDashboardMetrics: {
        range: {
            preset: DashboardRangePreset | "CUSTOM";
            start: string;
            end: string;
        };
        kpis: DashboardMetric[];
        orderTrend: TrendPoint[];
        topRestaurants: RestaurantPerformance[];
    };
};

const RANGE_OPTIONS: Array<{ label: string; value: DashboardRangePreset }> = [
    { label: "Last 7 days", value: "LAST_7_DAYS" },
    { label: "Last 30 days", value: "LAST_30_DAYS" },
    { label: "Last 3 months", value: "LAST_90_DAYS" },
];

const KPI_ORDER = ["totalRevenue", "totalOrders", "averageOrderValue", "totalRestaurants"];

const KPI_LABELS: Record<string, string> = {
    totalRevenue: "Total Revenue",
    totalOrders: "Total Orders",
    averageOrderValue: "Avg. Order",
    totalRestaurants: "Total Restaurants",
    activeRestaurants: "Active Restaurants",
    newRestaurants: "New Restaurants",
    newUsers: "New Users",
};

const KPI_DESCRIPTIONS: Record<string, string> = {
    totalRevenue: "Gross revenue collected from completed payments in the selected range.",
    totalOrders: "Number of orders submitted across every restaurant.",
    averageOrderValue: "Average ticket size for completed orders.",
    totalRestaurants: "Total restaurants onboarded in Foody.",
    activeRestaurants: "Restaurants currently marked as active.",
    newRestaurants: "Restaurants created within this reporting window.",
    newUsers: "Net-new user accounts created during the selected range.",
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("en-US");

const formatMetricValue = (metric?: DashboardMetric | null) => {
    if (!metric) return "--";
    const rawValue = typeof metric.value === "number" ? metric.value : Number(metric.value ?? 0);

    if (metric.unit === "USD") {
        // Round Avg. Order to whole dollars in the dashboard's top stats
        const formatter =
            metric.key === "averageOrderValue" ? currencyFormatter : currencyFormatter;
        return formatter.format(Math.round(rawValue));
    }

    return numberFormatter.format(rawValue);
};

// formatRangeLabel removed - not displayed in the redesigned admin dashboard

export default function AdminDashboardPage() {
    const [rangePreset, setRangePreset] = useState<DashboardRangePreset>("LAST_7_DAYS");

    const { data, loading, error, refetch } = useQuery<AdminDashboardResponse>(
        ADMIN_DASHBOARD_QUERY,
        {
            variables: {
                range: { preset: rangePreset },
            },
        },
    );

    useEffect(() => {
        if (error) {
            toast.error(`Unable to load dashboard: ${extractErrorMessage(error)}`);
        }
    }, [error]);

    const metrics = data?.adminDashboardMetrics;

    const orderedKpis = useMemo(() => {
        const map = new Map((metrics?.kpis ?? []).map((metric) => [metric.key, metric]));
        return KPI_ORDER.map((key) => ({
            key,
            label: KPI_LABELS[key] ?? key,
            metric: map.get(key) ?? null,
        }));
    }, [metrics?.kpis]);

    const summaryStats = useMemo(
        () =>
            orderedKpis.map(({ key, label, metric }) => ({
                key,
                label,
                value: metric ? formatMetricValue(metric) : "--",
                tooltip: KPI_DESCRIPTIONS[key] ?? metric?.label ?? label,
                isLoading: loading && !metric,
            })),
        [orderedKpis, loading],
    );

    return (
        <div className="flex h-full flex-col gap-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">Admin Dashboard</h1>
                    {/* Range label removed; the selector communicates the chosen window */}
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
                            {RANGE_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => refetch()}
                        disabled={loading}
                    >
                        {loading ? <Spinner /> : <RefreshCw className="size-4" />}
                        Refresh
                    </Button>
                </div>
            </div>

            {error && (
                <Alert variant="destructive">
                    <AlertDescription>{extractErrorMessage(error)}</AlertDescription>
                </Alert>
            )}

            {/* Top stat section */}
            <TopStatsSection
                items={summaryStats.slice(0, 4).map(
                    (item) =>
                        ({
                            key: item.key,
                            label: item.label,
                            value: item.value,
                            tooltip: item.tooltip,
                            isLoading: item.isLoading,
                        }) as StatItem,
                )}
            />

            <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-[2fr_1fr]">
                <OrderTrendChart
                    data={metrics?.orderTrend ?? []}
                    loading={loading && !metrics}
                    range={metrics?.range}
                />
                <TopRestaurantsPieChart
                    data={metrics?.topRestaurants ?? []}
                    loading={loading && !metrics}
                />
            </div>
        </div>
    );
}
