"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
    const router = useRouter();

    useEffect(() => {
        const token = localStorage.getItem("auth_token");
        if (!token) {
            router.push("/login");
            return;
        }

        const role = localStorage.getItem("user_role");
        const userData = JSON.parse(localStorage.getItem("user_data") || "{}");

        if (role === "ADMIN") {
            router.push("/admin/dashboard");
        } else if (userData.restaurantId) {
            router.push(`/restaurant/${userData.restaurantId}/dashboard`);
        } else {
            router.push("/");
        }
    }, [router]);

    return (
        <div className="flex min-h-screen items-center justify-center">
            <div className="border-foreground h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
        </div>
    );
}
