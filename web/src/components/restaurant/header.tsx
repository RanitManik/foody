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
import { RestaurantSidebar } from "./sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Breadcrumb,
    BreadcrumbList,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Skeleton } from "@/components/ui/skeleton";
import { useTheme } from "next-themes";
import FeedbackModal from "@/components/admin/feedback-modal";
import { useQuery } from "@apollo/client/react";
import Link from "next/link";
import { useRouter } from "nextjs-toploader/app";
import { gql } from "@apollo/client/core";
import { cn } from "@/lib/utils";

const GET_RESTAURANTS = gql`
    query GetRestaurantsForHeader {
        restaurants {
            restaurants {
                id
                name
                isActive
                location
            }
        }
    }
`;

type RestaurantsListData = {
    restaurants: {
        restaurants: Array<{
            id: string;
            name: string;
            isActive: boolean;
            location: string;
        }>;
    };
};

export function RestaurantHeader({
    restaurantId,
    onOpenFeedback,
}: {
    restaurantId: string;
    onOpenFeedback?: (open: boolean) => void;
}) {
    const { user, logout } = useAuth();
    const { theme, setTheme } = useTheme();
    const themeLabel = theme ? theme.charAt(0).toUpperCase() + theme.slice(1) : "System";
    const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
    const openFeedback = () => (onOpenFeedback ? onOpenFeedback(true) : setIsFeedbackOpen(true));

    const { data: allRestaurantsData, loading: restaurantsLoading } = useQuery<RestaurantsListData>(
        GET_RESTAURANTS,
        { skip: !restaurantId },
    );

    const restaurant = allRestaurantsData?.restaurants?.restaurants?.find(
        (r) => r.id === restaurantId,
    );

    const router = useRouter();

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
        <header className="bg-background flex h-12 items-center justify-start gap-4 border-b px-4 lg:h-14">
            <Sheet>
                <SheetTrigger asChild>
                    <Button variant="outline" size="icon" className="shrink-0 md:hidden">
                        <Menu className="h-5 w-5" />
                        <span className="sr-only">Toggle navigation menu</span>
                    </Button>
                </SheetTrigger>
                <SheetContent side="left" className="flex w-72 flex-col p-0 md:hidden">
                    <RestaurantSidebar restaurantId={restaurantId} onOpenFeedback={openFeedback} />
                </SheetContent>
            </Sheet>
            {/* Left Side: Restaurant Info */}
            <div className="flex items-center gap-4">
                {user?.role === "ADMIN" ? (
                    <Breadcrumb className="text-sm">
                        <BreadcrumbList className="flex-nowrap">
                            <BreadcrumbItem>
                                <BreadcrumbLink asChild>
                                    <Link href="/admin/restaurants">Restaurants</Link>
                                </BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator />
                            <BreadcrumbItem>
                                <DropdownMenu>
                                    <DropdownMenuTrigger className="flex items-center gap-2 rounded-md p-0! hover:bg-transparent focus-visible:outline-none">
                                        <span className="w-15 truncate text-sm font-semibold sm:w-auto">
                                            {restaurant?.name || "Restaurant"}
                                        </span>
                                        <ChevronDown className="text-muted-foreground size-4" />
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="start" className="min-w-[180px]">
                                        {restaurantsLoading ? (
                                            <div className="space-y-2 p-2">
                                                <Skeleton className="h-4 w-full" />
                                                <Skeleton className="h-4 w-3/4" />
                                                <Skeleton className="h-4 w-1/2" />
                                            </div>
                                        ) : (
                                            (allRestaurantsData?.restaurants?.restaurants || [])
                                                .filter((r) => r.id !== restaurant?.id)
                                                .map((r) => (
                                                    <DropdownMenuItem
                                                        key={r.id}
                                                        onClick={() =>
                                                            router.push(
                                                                `/restaurant/${r.id}/dashboard`,
                                                            )
                                                        }
                                                    >
                                                        {r.name}
                                                    </DropdownMenuItem>
                                                ))
                                        )}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>
                ) : (
                    <div className="bg-card flex items-center gap-3 rounded-lg border px-3 py-1.5 shadow-sm">
                        <div
                            className={cn(
                                "h-2 w-2 rounded-full",
                                restaurant?.isActive ? "bg-green-500" : "bg-red-500",
                            )}
                        />
                        <span className="text-sm font-semibold">
                            {restaurant?.name || "Restaurant"}
                        </span>
                    </div>
                )}
            </div>{" "}
            {/* Right Side: Date, Time, Profile */}
            <div className="ml-auto flex items-center gap-3">
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
