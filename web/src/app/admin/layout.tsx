"use client";

import { useState, useEffect } from "react";
import { AdminHeader } from "@/components/admin/header";
import { AdminSidebar } from "@/components/admin/sidebar";
import { cn } from "@/lib/utils";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const [isCollapsed, setIsCollapsed] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem("admin-sidebar-collapsed");
        if (saved) {
            setIsCollapsed(JSON.parse(saved));
        }
    }, []);

    const toggleCollapse = () => {
        const newCollapsed = !isCollapsed;
        setIsCollapsed(newCollapsed);
        localStorage.setItem("admin-sidebar-collapsed", JSON.stringify(newCollapsed));
    };

    return (
        <div
            className={cn(
                "grid min-h-screen w-full transition-all duration-300 ease-in-out",
                isCollapsed
                    ? "md:grid-cols-[70px_1fr]"
                    : "md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]",
            )}
        >
            <AdminSidebar isCollapsed={isCollapsed} toggleCollapse={toggleCollapse} />
            <div className="flex min-h-0 min-w-0 flex-col">
                <AdminHeader />
                <main className="flex min-h-0 flex-1 flex-col gap-4 overflow-x-hidden p-4 lg:gap-6 lg:p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}
