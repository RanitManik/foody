"use client";

import { ApolloProvider } from "@apollo/client/react";
import { ThemeProvider } from "next-themes";
import { client } from "@/lib/apollo";
import { Toaster } from "sonner";
import { AuthProvider } from "@/lib/auth-context";
import NextTopLoader from "nextjs-toploader";

export function Providers({ children }: { children: React.ReactNode }) {
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
