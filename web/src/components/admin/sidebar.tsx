"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Settings, MessageSquare, PanelLeftClose } from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

const sidebarItems = [
    {
        title: "Restaurants",
        href: "/admin/restaurants",
        icon: LayoutDashboard,
    },
    {
        title: "Settings",
        href: "/admin/settings",
        icon: Settings,
    },
];

export interface AdminSidebarProps {
    isCollapsed?: boolean;
    toggleCollapse?: () => void;
    onOpenFeedback?: (open: boolean) => void;
}

export function AdminSidebar({ isCollapsed, toggleCollapse, onOpenFeedback }: AdminSidebarProps) {
    const pathname = usePathname();

    return (
        <div
            className={cn(
                "bg-sidebar text-sidebar-foreground flex h-full flex-col overflow-x-hidden border-r transition-all duration-300",
            )}
        >
            <div
                className={cn(
                    "flex h-14 items-center border-b px-4 lg:h-[60px]",
                    isCollapsed ? "justify-center px-2" : "lg:px-6",
                )}
            >
                <div className="flex items-center gap-2 font-semibold">
                    <Logo className="h-6 w-6" size={24} />
                    {!isCollapsed && (
                        <>
                            <span className="">Foody</span>
                        </>
                    )}
                </div>
            </div>
            <div className="flex-1 overflow-x-hidden py-4">
                {/* {!isCollapsed && (
                    <div className="mb-2 px-4">
                        <h2 className="text-muted-foreground mb-2 text-xs font-semibold tracking-wider">
                            ORGANIZATION
                        </h2>
                    </div>
                )} */}
                <nav className="grid items-start gap-1 px-2 text-sm font-medium lg:px-4">
                    {sidebarItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex items-center gap-3 rounded-md px-3 py-2 transition-all",
                                pathname === item.href || pathname.startsWith(item.href + "/")
                                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                                    : "text-muted-foreground",
                                isCollapsed && "justify-center px-2",
                            )}
                            title={isCollapsed ? item.title : undefined}
                        >
                            <item.icon className="size-5 shrink-0" />
                            {!isCollapsed && item.title}
                        </Link>
                    ))}
                </nav>
            </div>
            <div className="mt-auto border-t p-4">
                <nav className="grid gap-1">
                    <button
                        type="button"
                        onClick={() => onOpenFeedback?.(true)}
                        className={cn(
                            "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all",
                            isCollapsed && "justify-center px-2",
                        )}
                        title={isCollapsed ? "Feedback" : undefined}
                    >
                        <MessageSquare className="size-5 shrink-0" />
                        {!isCollapsed && "Feedback"}
                    </button>
                    <Button
                        variant="ghost"
                        className={cn(
                            "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground cursor-pointer justify-start gap-3 px-3",
                            isCollapsed && "justify-center px-2",
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
