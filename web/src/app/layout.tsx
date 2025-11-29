import "./global.css";
import { Providers } from "./providers";

export const metadata = {
    title: "Foody",
    description:
        "A comprehensive full-stack food ordering application implementing role-based access control (RBAC) with restaurant-based restrictions, designed as a solution for Nick Fury's restaurant operations.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body>
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}
