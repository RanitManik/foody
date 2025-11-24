"use client";

import { ShieldX } from "lucide-react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

export function AccessDenied() {
    const { user } = useAuth();

    return (
        <div className="bg-background text-foreground flex min-h-svh flex-col">
            {/* Header */}
            <div className="flex w-full items-center justify-between p-4 sm:p-6 lg:p-8">
                <div className="flex items-center text-lg font-medium">
                    <Logo className="mr-2 h-6 w-6" size={24} />
                    Foody
                </div>
                <ThemeToggle />
            </div>

            {/* Main content */}
            <div className="flex flex-1 items-center justify-center px-6 sm:px-8 lg:px-12">
                <div className="animate-in fade-in w-full max-w-md space-y-6 text-center duration-300">
                    <div className="space-y-4">
                        <div className="bg-destructive/10 border-destructive/20 rounded-lg border p-6 font-mono">
                            <div className="text-muted-foreground mb-2 text-sm">Access Status</div>
                            <div className="text-destructive mb-2 text-6xl font-bold">
                                <ShieldX className="mx-auto h-16 w-16" />
                            </div>
                            <div className="text-muted-foreground text-sm">Access Denied</div>
                        </div>

                        <div>
                            <h1 className="mb-2 text-2xl font-bold">Permission Required</h1>
                            <p className="text-muted-foreground text-sm leading-relaxed sm:text-base">
                                You don&apos;t have the necessary permissions to access this page.
                                {user
                                    ? " Please contact your administrator if you believe this is an error."
                                    : " Please log in to continue."}
                            </p>
                            {user && (
                                <p className="text-muted-foreground mt-2 text-sm">
                                    Current role:{" "}
                                    <span className="text-foreground font-medium">{user.role}</span>
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="space-y-3">
                        {user ? (
                            <Button asChild className="w-full" size="lg">
                                <Link
                                    href={
                                        user.role === "ADMIN"
                                            ? "/admin/restaurants"
                                            : `/restaurant/${user.restaurantId}/orders`
                                    }
                                >
                                    Go to Dashboard
                                </Link>
                            </Button>
                        ) : (
                            <Button asChild className="w-full" size="lg">
                                <Link href="/login">Go to Login</Link>
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="text-muted-foreground mx-auto p-4 text-center text-xs sm:p-6 lg:p-8">
                © 2025 Foody.{" "}
                <Link href="/terms" className="hover:underline">
                    Terms
                </Link>{" "}
                |{" "}
                <Link href="/privacy-policy" className="hover:underline">
                    Privacy
                </Link>
            </div>
        </div>
    );
}
