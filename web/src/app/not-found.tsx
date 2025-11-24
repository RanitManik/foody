"use client";

import { FileQuestion } from "lucide-react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function NotFound() {
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
                        <div className="rounded-lg border border-orange-500/20 bg-orange-500/10 p-6 font-mono">
                            <div className="text-muted-foreground mb-2 text-sm">HTTP Status</div>
                            <div className="mb-2 text-6xl font-bold text-orange-500">
                                <FileQuestion className="mx-auto h-16 w-16" />
                            </div>
                            <div className="text-muted-foreground text-sm">Page Not Found</div>
                        </div>

                        <div>
                            <h1 className="mb-2 text-2xl font-bold">Page Not Found</h1>
                            <p className="text-muted-foreground text-sm leading-relaxed sm:text-base">
                                The page you&apos;re looking for doesn&apos;t exist or has been
                                moved. Please check the URL or navigate back to a known page.
                            </p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <Button asChild className="w-full" size="lg">
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
