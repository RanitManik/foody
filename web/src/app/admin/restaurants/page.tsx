"use client";

import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Search, MoreVertical, PlusCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";

// Mock data
const restaurants = [
    {
        id: "restaurant-india-1",
        name: "Spice Garden",
        region: "Bangalore",
        createdAt: "Nov 14, 2025 10:17 pm",
        storage: "79.47 MB",
        lastActive: "Nov 23, 2025 11:18 am",
        branches: 2,
    },
    {
        id: "restaurant-india-2",
        name: "Tandoor Express",
        region: "Bangalore",
        createdAt: "Nov 7, 2025 7:43 pm",
        storage: "62.65 MB",
        lastActive: "Nov 17, 2025 1:21 am",
        branches: 2,
    },
    {
        id: "restaurant-america-1",
        name: "Burger Haven",
        region: "New York",
        createdAt: "Oct 30, 2025 3:46 pm",
        storage: "48.14 MB",
        lastActive: "Nov 21, 2025 11:40 pm",
        branches: 2,
    },
    {
        id: "restaurant-america-2",
        name: "Pizza Palace",
        region: "New York",
        createdAt: "Oct 15, 2025 12:25 am",
        storage: "31.26 MB",
        lastActive: "Oct 15, 2025 1:04 am",
        branches: 1,
    },
];

export default function AdminRestaurantsPage() {
    const router = useRouter();

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-semibold tracking-tight">RANIT&apos;s projects</h1>
                <div className="flex items-center gap-2">
                    <Button variant="outline">Import data</Button>
                    <Button className="bg-white text-black hover:bg-zinc-200">New project</Button>
                </div>
            </div>

            <div className="relative">
                <Search className="text-muted-foreground absolute top-3 left-3 h-4 w-4" />
                <Input placeholder="Search..." className="pl-9" />
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[250px]">Name</TableHead>
                            <TableHead>Region</TableHead>
                            <TableHead>Created at</TableHead>
                            <TableHead>Storage</TableHead>
                            <TableHead>Compute last active at</TableHead>
                            <TableHead>Branches</TableHead>
                            <TableHead>Integrations</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {restaurants.map((restaurant) => (
                            <TableRow
                                key={restaurant.id}
                                className="cursor-pointer"
                                onClick={() =>
                                    router.push(`/restaurant/${restaurant.id}/dashboard`)
                                }
                            >
                                <TableCell className="font-medium">
                                    <div className="flex items-center gap-2">
                                        <div className="h-2 w-2 rounded-full bg-emerald-500" />
                                        {restaurant.name}
                                    </div>
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                    {restaurant.region}
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                    {restaurant.createdAt}
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                    {restaurant.storage}
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                    {restaurant.lastActive}
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                    {restaurant.branches}
                                </TableCell>
                                <TableCell>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-muted-foreground h-7 gap-1 hover:text-white"
                                    >
                                        Add
                                        <PlusCircle className="h-3.5 w-3.5" />
                                    </Button>
                                </TableCell>
                                <TableCell>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-muted-foreground h-8 w-8"
                                    >
                                        <MoreVertical className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
