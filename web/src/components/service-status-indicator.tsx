import React from "react";

interface ServiceStatusIndicatorProps {
    status: "checking" | "healthy" | "error";
    label?: string;
    variant?: "small" | "large";
}

export function ServiceStatusIndicator({
    status,
    label,
    variant = "small",
}: ServiceStatusIndicatorProps) {
    const getColor = () => {
        switch (status) {
            case "healthy":
                return "bg-green-500";
            case "checking":
                return "bg-blue-500";
            case "error":
                return "bg-red-500";
            default:
                return "bg-gray-500";
        }
    };

    const size = variant === "large" ? "h-6 w-6" : "h-3 w-3";

    return (
        <div className="flex items-center justify-center space-x-2">
            <div className={`relative ${size} rounded-full ${getColor()} animate-pulse shadow-lg`}>
                {status === "checking" && (
                    <div
                        className={`absolute inset-0 ${size} animate-ping rounded-full bg-blue-500 opacity-75`}
                    ></div>
                )}
            </div>
        </div>
    );
}
