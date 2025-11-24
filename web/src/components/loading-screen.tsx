import React, { useState, useEffect } from "react";
import { ServiceStatusIndicator } from "./service-status-indicator";

export function LoadingScreen() {
    const [showFull, setShowFull] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setShowFull(true), 5000);
        return () => clearTimeout(timer);
    }, []);

    if (!showFull) {
        return (
            <div className="flex min-h-svh items-center justify-center bg-black">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-white border-t-transparent" />
            </div>
        );
    }

    return (
        <div
            className="flex min-h-screen items-center justify-center bg-black"
            style={{
                backgroundImage: `url("data:image/svg+xml,%3csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3e%3cg fill='none' stroke='%23ffffff' stroke-width='0.5' opacity='0.1'%3e%3cpath d='m0 0h60v60h-60z'/%3e%3cpath d='m0 15h60'/%3e%3cpath d='m0 30h60'/%3e%3cpath d='m0 45h60'/%3e%3cpath d='m15 0v60'/%3e%3cpath d='m30 0v60'/%3e%3cpath d='m45 0v60'/%3e%3c/g%3e%3c/svg%3e")`,
            }}
        >
            <div className="mx-4 w-full max-w-md rounded-2xl border border-gray-800 bg-black/80 p-8 shadow-2xl shadow-white/10 backdrop-blur-md">
                <div className="space-y-6 text-center">
                    <div className="flex justify-center">
                        <ServiceStatusIndicator status="checking" variant="large" />
                    </div>
                    <div className="space-y-3">
                        <h2 className="bg-linear-to-r from-white to-gray-300 bg-clip-text text-2xl font-bold text-transparent">
                            Starting Foody
                        </h2>
                        <p className="leading-relaxed text-gray-300">
                            We are firing up the server on Render&#39;s free tier. This usually
                            takes 10-30 seconds on first load.
                        </p>
                        <p className="animate-pulse text-sm text-gray-400">
                            Checking server health...
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
