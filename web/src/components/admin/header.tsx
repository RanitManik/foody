"use client";

import { useAuth } from "@/lib/auth-context";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuSubContent,
    DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";
import {
    Menu,
    Moon,
    Sun,
    Monitor,
    Check,
    ChevronDown,
    Calendar,
    User as UserIcon,
    LogOut,
    Settings,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { AdminSidebar } from "./sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTheme } from "next-themes";
import FeedbackModal from "./feedback-modal";

export function AdminHeader({ onOpenFeedback }: { onOpenFeedback?: (open: boolean) => void }) {
    const { user, logout } = useAuth();
    const { theme, setTheme } = useTheme();
    const themeLabel = theme ? theme.charAt(0).toUpperCase() + theme.slice(1) : "System";
    const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
    const openFeedback = () => (onOpenFeedback ? onOpenFeedback(true) : setIsFeedbackOpen(true));

    // Date and Time State
    const [currentDate, setCurrentDate] = useState<Date>(() => new Date());

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentDate(new Date());
        }, 60000); // Update every minute

        return () => clearInterval(timer);
    }, []);

    const formattedDate = currentDate
        ? new Intl.DateTimeFormat("en-US", {
              weekday: "long",
              day: "numeric",
              month: "short",
              year: "numeric",
          }).format(currentDate)
        : "";

    const formattedTime = currentDate
        ? new Intl.DateTimeFormat("en-US", {
              hour: "numeric",
              minute: "numeric",
              hour12: true,
          }).format(currentDate)
        : "";

    return (
        <header className="bg-background flex h-12 items-center justify-between gap-4 border-b px-4 lg:h-14">
            <Sheet>
                <SheetTrigger asChild>
                    <Button variant="outline" size="icon" className="shrink-0 md:hidden">
                        <Menu className="h-5 w-5" />
                        <span className="sr-only">Toggle navigation menu</span>
                    </Button>
                </SheetTrigger>
                <SheetContent side="left" className="flex w-72 flex-col p-0 md:hidden">
                    <AdminSidebar onOpenFeedback={openFeedback} />
                </SheetContent>
            </Sheet>

            {/* Left Side: Empty for admin */}
            <div className="flex items-center gap-4">
                {/* Admin doesn't need restaurant info like restaurant header */}
            </div>

            {/* Right Side: Date, Time, Profile */}
            <div className="flex items-center gap-3">
                {/* Date & Time */}
                <div className="bg-card hidden items-center gap-2 rounded-lg border px-3 py-1.5 shadow-sm lg:flex">
                    <Calendar className="text-muted-foreground h-4 w-4" />
                    <span className="text-sm font-medium">
                        {formattedDate} at {formattedTime}
                    </span>
                </div>

                {/* Profile Dropdown */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="outline"
                            className="hover:bg-accent flex h-9 items-center gap-2 rounded-lg px-2 shadow-sm"
                        >
                            <Avatar className="h-6 w-6">
                                <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
                                <AvatarFallback>CN</AvatarFallback>
                            </Avatar>
                            <span className="hidden text-sm font-medium sm:inline-block">
                                {user ? `${user.firstName} ${user.lastName}` : "User"}
                            </span>
                            <ChevronDown className="text-muted-foreground h-3 w-3" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                        <div className="flex flex-col space-y-1 p-2">
                            <p className="text-sm leading-none font-medium">
                                {user ? `${user.firstName} ${user.lastName}` : "User"}
                            </p>
                            <p className="text-muted-foreground text-xs leading-none">
                                {user?.email ?? "—"}
                            </p>
                        </div>
                        <DropdownMenuSeparator />
                        <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                                <Settings className="h-4 w-4" />
                                Theme: {themeLabel}
                            </DropdownMenuSubTrigger>
                            <DropdownMenuPortal>
                                <DropdownMenuSubContent>
                                    <DropdownMenuItem onClick={() => setTheme("light")}>
                                        <Sun className="h-4 w-4" />
                                        Light
                                        {theme === "light" && (
                                            <Check className="text-accent-foreground ml-auto h-4 w-4" />
                                        )}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setTheme("dark")}>
                                        <Moon className="h-4 w-4" />
                                        Dark
                                        {theme === "dark" && (
                                            <Check className="text-accent-foreground ml-auto h-4 w-4" />
                                        )}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setTheme("system")}>
                                        <Monitor className="h-4 w-4" />
                                        System
                                        {(theme === "system" || theme === undefined) && (
                                            <Check className="text-accent-foreground ml-auto h-4 w-4" />
                                        )}
                                    </DropdownMenuItem>
                                </DropdownMenuSubContent>
                            </DropdownMenuPortal>
                        </DropdownMenuSub>
                        <DropdownMenuItem onClick={openFeedback}>
                            <UserIcon className="h-4 w-4" />
                            Help &amp; Feedback
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={logout}>
                            <LogOut className="h-4 w-4" />
                            Logout
                        </DropdownMenuItem>
                        {!onOpenFeedback ? (
                            <FeedbackModal open={isFeedbackOpen} onOpenChange={setIsFeedbackOpen} />
                        ) : null}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}
