"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AdminHeader } from "@/components/admin/header";
import { AdminSidebar } from "@/components/admin/sidebar";
import FeedbackModal from "@/components/admin/feedback-modal";
import { AccessDenied } from "@/components/auth/access-denied";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const { user, loading, hasToken } = useAuth();

    const [isCollapsed, setIsCollapsed] = useState<boolean | null>(null);

    useEffect(() => {
        const saved = localStorage.getItem("admin-sidebar-collapsed");
        if (saved) {
            setIsCollapsed(JSON.parse(saved));
        } else {
            // If not saved, default to expanded (false)
            setIsCollapsed(false);
        }
    }, []);

    const toggleCollapse = () => {
        const newCollapsed = !isCollapsed;
        setIsCollapsed(newCollapsed);
        localStorage.setItem("admin-sidebar-collapsed", JSON.stringify(newCollapsed));
    };

    const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

    useEffect(() => {
        if (!loading && !user && !hasToken) {
            router.replace("/login");
        }
    }, [loading, user, hasToken, router]);

    // Check permissions
    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                {/* <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" /> */}
            </div>
        );
    }

    if (!user) {
        if (!hasToken) {
            return (
                <div className="flex min-h-screen items-center justify-center">
                    {/* <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" /> */}
                </div>
            );
        }
        return <AccessDenied />;
    }

    if (user.role !== "ADMIN") {
        return <AccessDenied />;
    }

    return (
        <div
            className={cn(
                "grid min-h-screen w-full transition-all duration-300 ease-in-out",
                isCollapsed
                    ? "md:grid-cols-[70px_1fr]"
                    : "md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]",
            )}
        >
            {isCollapsed === null ? (
                // While we read user's sidebar preference, render a slim skeleton to avoid layout flash
                // Hide the static sidebar on small screens; mobile uses the header sheet instead
                <aside
                    className={cn(
                        "bg-sidebar text-sidebar-foreground hidden border-r p-4 md:block",
                    )}
                >
                    <div className="bg-muted/50 h-full w-10 animate-pulse rounded-md" />
                </aside>
            ) : (
                <div className="hidden md:block">
                    <AdminSidebar
                        isCollapsed={isCollapsed}
                        toggleCollapse={toggleCollapse}
                        onOpenFeedback={setIsFeedbackOpen}
                    />
                </div>
            )}
            <div className="flex min-h-0 min-w-0 flex-col">
                <AdminHeader onOpenFeedback={setIsFeedbackOpen} />
                <main className="flex min-h-0 flex-1 flex-col gap-4 overflow-x-hidden p-4 lg:gap-4 lg:p-4">
                    {children}
                </main>
                <FeedbackModal open={isFeedbackOpen} onOpenChange={setIsFeedbackOpen} />
            </div>
        </div>
    );
}
