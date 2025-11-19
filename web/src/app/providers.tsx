"use client";

import { ApolloProvider } from "@apollo/client/react";
import { ThemeProvider } from "next-themes";
import { client } from "@/lib/apollo";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
        >
            <ApolloProvider client={client}>{children}</ApolloProvider>
        </ThemeProvider>
    );
}
