"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    MessageSquare,
    PanelLeftClose,
    Utensils,
    ClipboardList,
    CreditCard,
    Settings,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

const sidebarItems = [
    {
        title: "Menu Order",
        href: "/restaurant/[id]/orders/create",
        icon: ClipboardList,
    },
    {
        title: "Orders",
        href: "/restaurant/[id]/orders",
        icon: CreditCard,
    },
    {
        title: "Menu Management",
        href: "/restaurant/[id]/menu-management",
        icon: Utensils,
    },
    {
        title: "Payment Methods",
        href: "/restaurant/[id]/payment-methods",
        icon: Settings,
    },
];

export interface RestaurantSidebarProps {
    isCollapsed?: boolean;
    toggleCollapse?: () => void;
    onOpenFeedback?: (open: boolean) => void;
    restaurantId: string;
}

export function RestaurantSidebar({
    isCollapsed,
    toggleCollapse,
    onOpenFeedback,
    restaurantId,
}: RestaurantSidebarProps) {
    const pathname = usePathname();

    return (
        <div
            className={cn(
                "bg-sidebar text-sidebar-foreground flex h-full flex-col overflow-x-hidden border-r transition-all duration-300",
            )}
        >
            <div
                className={cn(
                    "hover:bg-secondary flex h-12 cursor-pointer items-center border-b px-2 transition-all lg:h-14 lg:px-6",
                )}
            >
                <div className="flex items-center gap-2 font-semibold">
                    <Logo className="h-6 w-6" size={24} />
                    {!isCollapsed && <span>Foody</span>}
                </div>
            </div>
            <div className="flex-1 overflow-x-hidden py-4">
                <nav className="grid items-start gap-1 px-2 text-sm font-medium lg:px-4">
                    {sidebarItems.map((item) => {
                        const itemHref = item.href.replace("[id]", restaurantId);
                        const isActive = pathname === itemHref;

                        return (
                            <Link
                                key={item.href}
                                href={itemHref}
                                className={cn(
                                    "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex items-center gap-3 rounded-md p-2 whitespace-nowrap transition-all",
                                    isActive
                                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                                        : "text-muted-foreground",
                                )}
                                title={isCollapsed ? item.title : undefined}
                            >
                                <item.icon className="size-5 shrink-0" />
                                {!isCollapsed && item.title}
                            </Link>
                        );
                    })}
                </nav>
            </div>
            <div className="mt-auto border-t p-4">
                <nav className="grid gap-1">
                    <Button
                        variant="ghost"
                        onClick={() => onOpenFeedback?.(true)}
                        className={cn(
                            "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground cursor-pointer justify-start gap-3 px-2!",
                        )}
                        title={isCollapsed ? "Feedback" : undefined}
                    >
                        <MessageSquare className="size-5 shrink-0" />
                        {!isCollapsed && "Feedback"}
                    </Button>
                    <Button
                        variant="ghost"
                        className={cn(
                            "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground cursor-pointer justify-start gap-3 px-2!",
                        )}
                        onClick={toggleCollapse}
                        title={isCollapsed ? "Expand menu" : "Collapse menu"}
                    >
                        <PanelLeftClose
                            className={cn("size-5 shrink-0", isCollapsed && "rotate-180")}
                        />
                        {!isCollapsed && "Collapse menu"}
                    </Button>
                </nav>
            </div>
        </div>
    );
}
