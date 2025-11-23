"use client";

import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { useQuery } from "@apollo/client/react";
import { gql } from "@apollo/client/core";
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
import { Menu, Moon, Sun, Monitor, Check } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { AdminSidebar } from "./sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTheme } from "next-themes";
import FeedbackModal from "./feedback-modal";

export function AdminHeader({ onOpenFeedback }: { onOpenFeedback?: (open: boolean) => void }) {
    const { logout } = useAuth();
    const ME = gql`
        query Me {
            me {
                id
                email
                firstName
                lastName
                role
            }
        }
    `;

    type MeData = {
        me?: { id: string; email?: string; firstName?: string; lastName?: string; role?: string };
    };
    const { data } = useQuery<MeData>(ME);
    const user = data?.me;
    const { theme, setTheme } = useTheme();
    const themeLabel = theme ? theme.charAt(0).toUpperCase() + theme.slice(1) : "System";
    const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
    const openFeedback = () => (onOpenFeedback ? onOpenFeedback(true) : setIsFeedbackOpen(true));

    return (
        <header className="bg-background flex h-14 items-center justify-end gap-4 border-b px-4 lg:h-[60px] lg:px-6">
            <Sheet>
                <SheetTrigger asChild>
                    <Button variant="outline" size="icon" className="shrink-0 md:hidden">
                        <Menu className="h-5 w-5" />
                        <span className="sr-only">Toggle navigation menu</span>
                    </Button>
                </SheetTrigger>
                <SheetContent side="left" className="flex w-72 flex-col p-0">
                    <AdminSidebar onOpenFeedback={openFeedback} />
                </SheetContent>
            </Sheet>

            <div className="flex items-center gap-4">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                            <Avatar className="h-8 w-8">
                                <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
                                <AvatarFallback>CN</AvatarFallback>
                            </Avatar>
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
                        {/* <DropdownMenuItem>Account settings</DropdownMenuItem> */}
                        <DropdownMenuSub>
                            <DropdownMenuSubTrigger>Theme: {themeLabel}</DropdownMenuSubTrigger>
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
                            Help &amp; Feedback
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />

                        <DropdownMenuItem onClick={logout}>Logout</DropdownMenuItem>
                        {/* Feedback dialog is controlled by local state when header is used without an external handler */}
                        {!onOpenFeedback ? (
                            <FeedbackModal open={isFeedbackOpen} onOpenChange={setIsFeedbackOpen} />
                        ) : null}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}
