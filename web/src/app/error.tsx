"use client";

import { AlertTriangle, RefreshCcw } from "lucide-react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    const [isRetrying, setIsRetrying] = useState(false);

    useEffect(() => {
        // Log the error to an error reporting service
        console.error(error);
    }, [error]);

    const handleRetry = async () => {
        setIsRetrying(true);
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Small delay for UX
        reset();
        setIsRetrying(false);
    };

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
                            <div className="text-muted-foreground mb-2 text-sm">HTTP Status</div>
                            <div className="text-destructive mb-2 text-6xl font-bold">
                                <AlertTriangle className="mx-auto h-16 w-16" />
                            </div>
                            <div className="text-muted-foreground text-sm">
                                Internal Server Error
                            </div>
                        </div>

                        <div>
                            <h1 className="mb-2 text-2xl font-bold">Something Went Wrong</h1>
                            <p className="text-muted-foreground text-sm leading-relaxed sm:text-base">
                                We encountered an unexpected error while processing your request.
                                Our team has been notified and is working on a fix.
                            </p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <Button
                            onClick={handleRetry}
                            className="w-full"
                            size="lg"
                            disabled={isRetrying}
                        >
                            <RefreshCcw className={`h-4 w-4 ${isRetrying ? "animate-spin" : ""}`} />
                            {isRetrying ? "Retrying..." : "Try Again"}
                        </Button>

                        <Button asChild variant="secondary" className="w-full" size="lg">
                            <Link href="/">Return to Homepage</Link>
                        </Button>
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
