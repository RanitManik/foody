import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export type StatItem = {
    key: string;
    label: string;
    value?: string;
    tooltip?: string;
    isLoading?: boolean;
};

interface TopStatsSectionProps {
    items: StatItem[];
}

export function TopStatsSection({ items }: TopStatsSectionProps) {
    return (
        <Card className="w-full">
            <CardContent className="p-0">
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4">
                    {items.map((item, i) => (
                        <div
                            key={item.key}
                            className={cn(
                                "bg-card flex min-h-[86px] items-center justify-center gap-4 px-6 py-3",
                                "md:border-border md:border-r md:last:border-r-0",
                            )}
                        >
                            <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground text-xs tracking-wide uppercase">
                                        {item.label}
                                    </span>
                                    {item.tooltip && (
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <button
                                                    type="button"
                                                    className="text-muted-foreground"
                                                    aria-label={`More info about ${item.label}`}
                                                >
                                                    <Info className="h-4 w-4" />
                                                </button>
                                            </TooltipTrigger>
                                            <TooltipContent>{item.tooltip}</TooltipContent>
                                        </Tooltip>
                                    )}
                                </div>
                                <div className="mt-1 text-2xl font-semibold tabular-nums sm:text-center">
                                    {item.isLoading ? (
                                        <Skeleton className="h-8 w-16 sm:mx-auto" />
                                    ) : (
                                        (item.value ?? "--")
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

export default TopStatsSection;
