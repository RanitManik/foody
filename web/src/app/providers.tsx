"use client";

import { ApolloProvider } from "@apollo/client/react";
import { ThemeProvider } from "next-themes";
import { client } from "@/lib/apollo";
import { Toaster } from "sonner";
import { AuthProvider } from "@/lib/auth-context";
import NextTopLoader from "nextjs-toploader";
import { useEffect, useState } from "react";

function LoadingScreen() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-black">
            <div className="space-y-4 text-center">
                <div className="border-primary mx-auto h-12 w-12 animate-spin rounded-full border-b-2"></div>
                <div className="space-y-2">
                    <h2 className="text-xl font-semibold text-white">Starting up...</h2>
                    <p className="max-w-md text-gray-400">
                        {`We're using Render's free tier, so the server might take a moment to wake up.
                        This usually takes 10-30 seconds on first load.`}
                    </p>
                    <p className="text-sm text-gray-200">Checking server health...</p>
                </div>
            </div>
        </div>
    );
}

export function Providers({ children }: { children: React.ReactNode }) {
    const [isHealthy, setIsHealthy] = useState(false);
    const [isChecking, setIsChecking] = useState(true);

    useEffect(() => {
        const checkHealth = async () => {
            const apiUrl = process.env.NEXT_PUBLIC_GRAPHQL_URI || "http://localhost:4000";
            const healthUrl = `${apiUrl.replace("/graphql", "")}/health`;

            try {
                const response = await fetch(healthUrl);
                if (response.ok) {
                    const data = await response.json();
                    if (data.status === "healthy") {
                        setIsHealthy(true);
                        setIsChecking(false);
                        return;
                    }
                }
            } catch (error) {
                // Continue checking
            }

            // Retry after 2 seconds
            setTimeout(checkHealth, 2000);
        };

        checkHealth();
    }, []);

    if (isChecking && !isHealthy) {
        return <LoadingScreen />;
    }

    return (
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
        >
            <NextTopLoader color="oklch(0.6587 0.2183 30.19)" height={2} showSpinner={false} />
            <Toaster richColors position="bottom-center" />
            <ApolloProvider client={client}>
                <AuthProvider>{children}</AuthProvider>
            </ApolloProvider>
        </ThemeProvider>
    );
}
