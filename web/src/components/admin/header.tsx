"use client";

import { useAuth } from "@/hooks/use-auth";
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
import { Menu, HelpCircle, ArrowUpCircle, CheckCircle2, Moon, Sun, Monitor } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { AdminSidebar } from "./sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTheme } from "next-themes";

export function AdminHeader() {
    const { logout } = useAuth();
    const { setTheme } = useTheme();

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
                    <AdminSidebar />
                </SheetContent>
            </Sheet>

            <div className="flex items-center gap-4">
                <div className="text-muted-foreground flex items-center gap-2 text-sm">
                    <span className="flex items-center gap-1.5 text-emerald-500">
                        <CheckCircle2 className="h-4 w-4" />
                        <span className="text-xs font-medium">All ok</span>
                    </span>
                </div>

                <Button variant="ghost" size="icon" className="text-muted-foreground">
                    <HelpCircle className="h-5 w-5" />
                </Button>

                <Button variant="outline" size="sm" className="h-8 gap-2">
                    <ArrowUpCircle className="h-4 w-4" />
                    Upgrade
                </Button>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                            <Avatar className="h-8 w-8">
                                <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
                                <AvatarFallback>CN</AvatarFallback>
                            </Avatar>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-64">
                        <div className="flex flex-col space-y-1 p-2">
                            <p className="text-sm leading-none font-medium">RANIT</p>
                            <p className="text-muted-foreground text-xs leading-none">
                                ranitmanikofficial@outlook.com
                            </p>
                        </div>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>Account settings</DropdownMenuItem>
                        <DropdownMenuSub>
                            <DropdownMenuSubTrigger>Theme: System</DropdownMenuSubTrigger>
                            <DropdownMenuPortal>
                                <DropdownMenuSubContent>
                                    <DropdownMenuItem onClick={() => setTheme("light")}>
                                        <Sun className="h-4 w-4" />
                                        Light
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setTheme("dark")}>
                                        <Moon className="h-4 w-4" />
                                        Dark
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setTheme("system")}>
                                        <Monitor className="h-4 w-4" />
                                        System
                                    </DropdownMenuItem>
                                </DropdownMenuSubContent>
                            </DropdownMenuPortal>
                        </DropdownMenuSub>
                        <DropdownMenuItem onClick={logout}>Logout</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}
