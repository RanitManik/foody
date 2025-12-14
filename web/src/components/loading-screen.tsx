import React, { useState, useEffect } from "react";
import { ServiceStatusIndicator } from "./service-status-indicator";
import { InteractiveGridPattern } from "./interactive-grid-pattern";

export function LoadingScreen() {
    const [showFull, setShowFull] = useState(false);
    const [countdown, setCountdown] = useState(90);

    useEffect(() => {
        const timer = setTimeout(() => setShowFull(true), 5000);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (!showFull) return;

        const timer = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 0) {
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [showFull]);

    if (!showFull) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-black">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-white border-t-transparent" />
            </div>
        );
    }

    const progress = ((90 - countdown) / 90) * 100;
    const circumference = 2 * Math.PI * 40; // radius 40
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    return (
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black text-white">
            <InteractiveGridPattern
                className="opacity-50"
                width={40}
                height={40}
                squares={[40, 40]}
                squaresClassName="text-white/[0.02]"
            />
            <div className="relative z-10 mx-4 w-full max-w-md overflow-hidden rounded-xl border border-white/20 bg-linear-to-br from-white/10 via-white/5 to-transparent p-8 shadow-2xl backdrop-blur-xl">
                {/* Background Glow */}
                <div className="absolute -top-20 -left-20 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl" />
                <div className="absolute -right-20 -bottom-20 h-64 w-64 rounded-full bg-purple-500/20 blur-3xl" />

                <div className="relative flex flex-col items-center text-center">
                    {/* Progress Ring */}
                    <div className="relative flex h-32 w-32 items-center justify-center">
                        <svg className="h-full w-full -rotate-90 transform">
                            <circle
                                cx="64"
                                cy="64"
                                r="40"
                                stroke="currentColor"
                                strokeWidth="4"
                                fill="transparent"
                                className="text-white/10"
                            />
                            <circle
                                cx="64"
                                cy="64"
                                r="40"
                                stroke="currentColor"
                                strokeWidth="4"
                                fill="transparent"
                                strokeDasharray={circumference}
                                strokeDashoffset={strokeDashoffset}
                                className="text-white transition-all duration-1000 ease-linear"
                                strokeLinecap="round"
                            />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-3xl font-bold tracking-tighter tabular-nums">
                                {countdown}
                            </span>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-center gap-2">
                            <ServiceStatusIndicator status="checking" />
                            <span className="text-sm font-medium text-white/60">Server Status</span>
                        </div>

                        <h2 className="text-3xl font-bold tracking-tight">
                            <span className="bg-linear-to-r from-white to-white/60 bg-clip-text text-transparent">
                                Starting Foody
                            </span>
                        </h2>

                        <p className="text-base leading-relaxed text-white/60">
                            We are firing up the server on Render&apos;s free tier.
                            <br />
                            This usually takes about <span className="text-white">90 seconds</span>.
                        </p>

                        {countdown === 0 && (
                            <div className="animate-in fade-in slide-in-from-bottom-2 mt-4 rounded-lg bg-white/5 p-3 text-sm text-white/80">
                                Still loading? The server might be taking a bit longer than usual.
                                Thanks for your patience!
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
