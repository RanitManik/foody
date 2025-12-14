import React, { useState, useEffect, useRef } from "react";
import { cn } from "../lib/utils";

interface InteractiveGridPatternProps extends React.HTMLAttributes<HTMLDivElement> {
    width?: number;
    height?: number;
    squares?: [number, number]; // [width, height] of each square
    className?: string;
    squaresClassName?: string;
}

export function InteractiveGridPattern({
    width = 40,
    height = 40,
    squares = [24, 24],
    className,
    squaresClassName,
    ...props
}: InteractiveGridPatternProps) {
    const [colors, setColors] = useState<string[][]>([]);
    const containerRef = useRef<HTMLDivElement>(null);

    // Generate a random bright neon color
    function generateBrightColor() {
        const hue = Math.floor(Math.random() * 360);
        return `hsl(${hue}, 100%, 50%)`;
    }

    useEffect(() => {
        const updateGridSize = () => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                const cols = Math.ceil(rect.width / width);
                const rows = Math.ceil(rect.height / height);
                setColors(
                    Array.from({ length: rows }, () =>
                        Array.from({ length: cols }, () => generateBrightColor()),
                    ),
                );
            }
        };

        updateGridSize();
        window.addEventListener("resize", updateGridSize);
        return () => window.removeEventListener("resize", updateGridSize);
    }, [width, height]);

    useEffect(() => {
        if (colors.length === 0) return;
        const interval = setInterval(() => {
            setColors((prev) => prev.map((row) => row.map(() => generateBrightColor())));
        }, 1000); // change all colors every 1 second

        return () => clearInterval(interval);
    }, [colors]);

    return (
        <div
            ref={containerRef}
            className={cn("absolute inset-0 h-full w-full overflow-hidden", className)}
            {...props}
        >
            <svg className="absolute inset-0 h-full w-full" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <pattern
                        id="grid-pattern"
                        width={width}
                        height={height}
                        patternUnits="userSpaceOnUse"
                        x={-1}
                        y={-1}
                    >
                        <path
                            d={`M.5 ${height}V.5H${width}`}
                            fill="none"
                            style={{ stroke: "rgba(255, 255, 255, 0.3)" }}
                            strokeWidth="1"
                        />
                    </pattern>
                </defs>

                {/* Base Grid - Subtle Gray/Fading */}
                <rect
                    width="100%"
                    height="100%"
                    fill="url(#grid-pattern)"
                    className={squaresClassName}
                />

                {/* Colored Cells */}
                {colors.map((row, y) =>
                    row.map((color, x) => (
                        <rect
                            key={`${x}-${y}`}
                            x={x * width}
                            y={y * height}
                            width={width}
                            height={height}
                            fill={color}
                            fillOpacity="0.6"
                            stroke={color}
                            strokeWidth="1"
                            className="transition-all duration-1000 ease-in-out"
                        />
                    )),
                )}
            </svg>

            {/* Radial Gradient Overlay for depth and fading edges */}
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_10%,black_100%)]" />
        </div>
    );
}
