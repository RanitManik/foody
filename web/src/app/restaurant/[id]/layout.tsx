"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useRouter } from "nextjs-toploader/app";
import { RestaurantHeader } from "@/components/restaurant/header";
import { RestaurantSidebar } from "@/components/restaurant/sidebar";
import FeedbackModal from "@/components/admin/feedback-modal";
import { AccessDenied } from "@/components/auth/access-denied";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

export default function RestaurantLayout({ children }: { children: React.ReactNode }) {
    const params = useParams();
    const router = useRouter();
    const restaurantId = params.id as string;
    const { user, loading, hasToken } = useAuth();

    const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
        if (typeof window === "undefined") return false;
        const saved = localStorage.getItem("restaurant-sidebar-collapsed");
        return saved ? JSON.parse(saved) : false;
    });

    const toggleCollapse = () => {
        const newCollapsed = !isCollapsed;
        setIsCollapsed(newCollapsed);
        localStorage.setItem("restaurant-sidebar-collapsed", JSON.stringify(newCollapsed));
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
                <div className="border-foreground h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
            </div>
        );
    }

    if (!user) {
        if (!hasToken) {
            return (
                <div className="flex min-h-screen items-center justify-center">
                    <div className="border-foreground h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
                </div>
            );
        }
        return <AccessDenied />;
    }

    // Allow ADMIN to access any restaurant
    // Allow MANAGER to access their assigned restaurant (enforced by API)
    // Allow MEMBER to access only their assigned restaurant
    const hasPermission =
        user.role === "ADMIN" ||
        (user.role === "MANAGER" && user.restaurantId) || // Managers can access any restaurant (will be filtered by API)
        (user.role === "MEMBER" && user.restaurantId && user.restaurantId === restaurantId);

    if (!hasPermission) {
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
            <div className="hidden md:block">
                <RestaurantSidebar
                    isCollapsed={isCollapsed}
                    toggleCollapse={toggleCollapse}
                    onOpenFeedback={setIsFeedbackOpen}
                    restaurantId={restaurantId}
                />
            </div>
            <div className="flex min-h-0 min-w-0 flex-col">
                <RestaurantHeader restaurantId={restaurantId} onOpenFeedback={setIsFeedbackOpen} />
                <main className="flex min-h-0 flex-1 flex-col gap-4 overflow-x-hidden p-4 lg:gap-4 lg:p-4">
                    {children}
                </main>
                <FeedbackModal open={isFeedbackOpen} onOpenChange={setIsFeedbackOpen} />
            </div>
        </div>
    );
}
