import React, { useState, useRef } from "react";
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
    const [hoveredCell, setHoveredCell] = useState<{ x: number; y: number; color: string } | null>(
        null,
    );
    const containerRef = useRef<HTMLDivElement>(null);

    // Generate a random bright neon color
    const generateBrightColor = () => {
        const hue = Math.floor(Math.random() * 360);
        return `hsl(${hue}, 100%, 50%)`;
    };

    const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
        if (!containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        // Calculate grid coordinates
        const col = Math.floor(x / width);
        const row = Math.floor(y / height);

        // Only update if the cell has changed to avoid constant re-renders/color flickering
        if (!hoveredCell || hoveredCell.x !== col || hoveredCell.y !== row) {
            setHoveredCell({ x: col, y: row, color: generateBrightColor() });
        }
    };

    const handleMouseLeave = () => {
        setHoveredCell(null);
    };

    return (
        <div
            ref={containerRef}
            className={cn("absolute inset-0 h-full w-full overflow-hidden", className)}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
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

                {/* Hovered Cell Highlight */}
                {hoveredCell && (
                    <rect
                        x={hoveredCell.x * width}
                        y={hoveredCell.y * height}
                        width={width}
                        height={height}
                        fill={hoveredCell.color}
                        fillOpacity="1"
                        stroke={hoveredCell.color}
                        strokeWidth="1"
                        className="transition-all duration-75 ease-out"
                        style={{
                            filter: `drop-shadow(0 0 8px ${hoveredCell.color})`,
                        }}
                    />
                )}
            </svg>

            {/* Radial Gradient Overlay for depth and fading edges */}
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_10%,black_100%)]" />
        </div>
    );
}
