"use client";

import { ApolloProvider } from "@apollo/client/react";
import { ThemeProvider } from "next-themes";
import { client } from "@/lib/apollo";
import { Toaster } from "sonner";
import { AuthProvider } from "@/lib/auth-context";
import NextTopLoader from "nextjs-toploader";
import { useEffect, useState } from "react";
import { LoadingScreen } from "@/components/loading-screen";
import { EasterEgg } from "@/components/ui/easter-egg";

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
            } catch {
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
            <EasterEgg />
            <ApolloProvider client={client}>
                <AuthProvider>{children}</AuthProvider>
            </ApolloProvider>
        </ThemeProvider>
    );
}
