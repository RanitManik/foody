"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { gql } from "@apollo/client/core";
import { useRouter } from "nextjs-toploader/app";
import { Plus, Search, MoreVertical, Edit, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
    SheetFooter,
    SheetClose,
} from "@/components/ui/sheet";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from "@/components/ui/empty";
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormDescription,
    FormMessage,
} from "@/components/ui/form";
import { toast } from "sonner";
import extractErrorMessage from "@/lib/errors";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";

const GET_RESTAURANTS = gql`
    query GetRestaurants($first: Int, $skip: Int) {
        restaurants(first: $first, skip: $skip) {
            restaurants {
                id
                name
                description
                address
                city
                location
                phone
                email
                isActive
                createdAt
            }
            totalCount
        }
    }
`;

const CREATE_RESTAURANT = gql`
    mutation CreateRestaurant($input: CreateRestaurantInput!) {
        createRestaurant(input: $input) {
            id
            name
            description
            address
            city
            location
            phone
            email
            isActive
            createdAt
        }
    }
`;

const UPDATE_RESTAURANT = gql`
    mutation UpdateRestaurant($id: ID!, $input: UpdateRestaurantInput!) {
        updateRestaurant(id: $id, input: $input) {
            id
            name
            description
            address
            city
            location
            phone
            email
            isActive
        }
    }
`;

const DELETE_RESTAURANT = gql`
    mutation DeleteRestaurant($id: ID!) {
        deleteRestaurant(id: $id)
    }
`;

const restaurantSchema = z.object({
    name: z.string().min(1, "Name is required"),
    description: z.string().optional(),
    address: z.string().min(1, "Address is required"),
    city: z.string().min(1, "City is required"),
    location: z.string().min(1, "Location is required"),
    phone: z.string().optional(),
    email: z.string().email("Invalid email").optional().or(z.literal("")),
    isActive: z.boolean().optional(),
});

type Restaurant = {
    id: string;
    name: string;
    description?: string;
    address: string;
    city: string;
    location: string;
    phone?: string;
    email?: string;
    isActive: boolean;
    createdAt: string;
};

type RestaurantsData = {
    restaurants: {
        restaurants: Restaurant[];
        totalCount: number;
    };
};

export default function AdminRestaurantsPage() {
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState("");
    const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false);
    const [editingRestaurant, setEditingRestaurant] = useState<Restaurant | null>(null);
    const [deletingRestaurant, setDeletingRestaurant] = useState<Restaurant | null>(null);
    const [deleteConfirmName, setDeleteConfirmName] = useState("");
    // second input expects user to type a confirmation phrase before deleting
    const [deleteConfirmPhrase, setDeleteConfirmPhrase] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 20;

    const { data, loading, error, refetch } = useQuery<RestaurantsData>(GET_RESTAURANTS, {
        variables: {
            first: pageSize,
            skip: (currentPage - 1) * pageSize,
        },
        fetchPolicy: "cache-first", // Use cache when available
    });

    const totalCount = data?.restaurants?.totalCount ?? 0;
    const totalPages = Math.ceil(totalCount / pageSize);
    const hasNextPage = currentPage < totalPages;

    useEffect(() => {
        if (error) {
            const msg = extractErrorMessage(error);
            toast.error(`Failed to load restaurants: ${msg}`);
        }
    }, [error]);

    const [createRestaurant, { loading: creating }] = useMutation(CREATE_RESTAURANT);
    const [updateRestaurant, { loading: updating }] = useMutation(UPDATE_RESTAURANT);
    const [deleteRestaurant, { loading: deleting }] = useMutation(DELETE_RESTAURANT);

    const createForm = useForm<z.infer<typeof restaurantSchema>>({
        resolver: zodResolver(restaurantSchema),
        defaultValues: {
            name: "",
            description: "",
            address: "",
            city: "",
            location: "",
            phone: "",
            email: "",
            isActive: true,
        },
    });

    const editForm = useForm<z.infer<typeof restaurantSchema>>({
        resolver: zodResolver(restaurantSchema),
        defaultValues: {
            name: "",
            description: "",
            address: "",
            city: "",
            location: "",
            phone: "",
            email: "",
            isActive: true,
        },
    });

    const filteredRestaurants =
        data?.restaurants?.restaurants?.filter(
            (restaurant: Restaurant) =>
                restaurant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                restaurant.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
                restaurant.location.toLowerCase().includes(searchTerm.toLowerCase()),
        ) || [];

    const handleCreate = async (values: z.infer<typeof restaurantSchema>) => {
        try {
            await createRestaurant({
                variables: {
                    input: {
                        name: values.name,
                        description: values.description || undefined,
                        address: values.address,
                        city: values.city,
                        location: values.location,
                        phone: values.phone || undefined,
                        email: values.email || undefined,
                        isActive: values.isActive,
                    },
                },
            });
            toast.success("Restaurant created successfully");
            setIsCreateSheetOpen(false);
            createForm.reset();
            refetch();
        } catch (error) {
            const msg = extractErrorMessage(error);
            toast.error(`Failed to create restaurant: ${msg}`);
            console.error("Create restaurant error:", error);
        }
    };

    const handleEdit = async (values: z.infer<typeof restaurantSchema>) => {
        if (!editingRestaurant) return;
        try {
            await updateRestaurant({
                variables: {
                    id: editingRestaurant.id,
                    input: {
                        name: values.name,
                        description: values.description || undefined,
                        address: values.address,
                        city: values.city,
                        location: values.location,
                        phone: values.phone || undefined,
                        email: values.email || undefined,
                        // send isActive directly from the form (false will be included)
                        isActive: values.isActive,
                    },
                },
            });
            toast.success("Restaurant updated successfully");
            setEditingRestaurant(null);
            editForm.reset();
            refetch();
        } catch (error) {
            const msg = extractErrorMessage(error);
            toast.error(`Failed to update restaurant: ${msg}`);
            console.error("Update restaurant error:", error);
        }
    };

    const handleDelete = async () => {
        if (!deletingRestaurant) return;
        // require exact restaurant name and the confirmation phrase before allowing deletion
        const CONFIRM_PHRASE = "delete my restaurant";
        if (
            deleteConfirmName !== deletingRestaurant.name ||
            deleteConfirmPhrase !== CONFIRM_PHRASE
        ) {
            toast.error("Confirmation details do not match");
            return;
        }
        try {
            await deleteRestaurant({
                variables: { id: deletingRestaurant.id },
            });
            toast.success("Restaurant deleted successfully");
            setDeletingRestaurant(null);
            setDeleteConfirmName("");
            setDeleteConfirmPhrase("");
            refetch();
        } catch (error) {
            const msg = extractErrorMessage(error);
            toast.error(`Failed to delete restaurant: ${msg}`);
            console.error("Delete restaurant error:", error);
        }
    };

    const openEditSheet = (restaurant: Restaurant) => {
        setEditingRestaurant(restaurant);
        editForm.reset({
            name: restaurant.name,
            description: restaurant.description || "",
            address: restaurant.address,
            city: restaurant.city,
            location: restaurant.location,
            phone: restaurant.phone || "",
            email: restaurant.email || "",
            isActive: restaurant.isActive,
        });
    };

    if (error) {
        return (
            <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-semibold tracking-tight">Restaurants</h1>
                </div>
                <div className="py-8 text-center">
                    <p className="text-destructive">Failed to load restaurants</p>
                    <Button onClick={() => refetch()} className="mt-4">
                        Try Again
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="grid h-full min-h-0 grid-rows-[auto_auto_1fr] gap-4">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-semibold tracking-tight">Restaurants</h1>
                <Sheet open={isCreateSheetOpen} onOpenChange={setIsCreateSheetOpen}>
                    <SheetTrigger asChild>
                        <Button size="sm">
                            <Plus className="h-4 w-4" />
                            New Restaurant
                        </Button>
                    </SheetTrigger>
                    <SheetContent className="sm:max-w-[425px]">
                        <SheetHeader className="border-border border-b">
                            <SheetTitle>Create Restaurant</SheetTitle>
                            <SheetDescription>Add a new restaurant to the system.</SheetDescription>
                        </SheetHeader>
                        <Form {...createForm}>
                            <form
                                id="create-form"
                                onSubmit={createForm.handleSubmit(handleCreate)}
                                className="space-y-4 p-4"
                            >
                                <FormField
                                    control={createForm.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>
                                                Name <span className="text-destructive">*</span>
                                            </FormLabel>
                                            <FormControl>
                                                <Input {...field} placeholder="Ex: Spice Garden" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={createForm.control}
                                    name="description"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Description</FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    {...field}
                                                    placeholder="Short description (optional)"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={createForm.control}
                                    name="address"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>
                                                Address <span className="text-destructive">*</span>
                                            </FormLabel>
                                            <FormControl>
                                                <Input {...field} placeholder="123 Main St" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={createForm.control}
                                    name="city"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>
                                                City <span className="text-destructive">*</span>
                                            </FormLabel>
                                            <FormControl>
                                                <Input {...field} placeholder="Ex: Bangalore" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={createForm.control}
                                    name="location"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>
                                                Location <span className="text-destructive">*</span>
                                            </FormLabel>
                                            <FormControl>
                                                <Input {...field} placeholder="Ex: Downtown" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={createForm.control}
                                    name="phone"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Phone</FormLabel>
                                            <FormControl>
                                                <Input
                                                    {...field}
                                                    placeholder="Optional — +1 555-555-555"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={createForm.control}
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Email</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="email"
                                                    {...field}
                                                    placeholder="Optional — contact@restaurant.com"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={createForm.control}
                                    name="isActive"
                                    render={({ field }) => (
                                        <FormItem className="flex items-center justify-between">
                                            <div>
                                                <FormLabel>Active</FormLabel>
                                                <FormDescription className="text-muted-foreground mt-1 text-sm">
                                                    Whether the restaurant accepts orders
                                                </FormDescription>
                                            </div>
                                            <FormControl>
                                                <Switch
                                                    checked={!!field.value}
                                                    onCheckedChange={(val) => field.onChange(val)}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </form>
                        </Form>
                        <SheetFooter className="border-border border-t">
                            <Button type="submit" form="create-form" disabled={creating}>
                                {creating ? (
                                    <span className="flex items-center">
                                        <Spinner className="mr-2" /> Creating
                                    </span>
                                ) : (
                                    "Create Restaurant"
                                )}
                            </Button>
                            <SheetClose asChild>
                                <Button variant="outline" disabled={creating}>
                                    Close
                                </Button>
                            </SheetClose>
                        </SheetFooter>
                    </SheetContent>
                </Sheet>
            </div>

            <div className="relative">
                <Search className="text-muted-foreground absolute top-2.5 left-3 h-4 w-4" />
                <Input
                    aria-label="Search restaurants by name, city or location"
                    placeholder="Search restaurants — name, city or location"
                    className="pr-10 pl-9"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Escape") setSearchTerm("");
                    }}
                />
                {searchTerm && (
                    <Button
                        variant="ghost"
                        aria-label="Clear search"
                        className="absolute top-1.5 right-2 size-6 cursor-pointer rounded-full"
                        onClick={() => setSearchTerm("")}
                        size="icon"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                )}
            </div>

            <div className="min-h-0 overflow-hidden border">
                <div className="h-full min-h-0 overflow-auto">
                    {/* Empty states */}
                    {!loading && data?.restaurants?.restaurants?.length === 0 ? (
                        <div className="p-6">
                            <Empty>
                                <EmptyHeader>
                                    <EmptyMedia variant="icon">
                                        <Plus />
                                    </EmptyMedia>
                                    <EmptyTitle>No restaurants yet</EmptyTitle>
                                    <EmptyDescription>
                                        {`You don't have any restaurants added. Create a restaurant to get started.`}
                                    </EmptyDescription>
                                </EmptyHeader>
                                <EmptyContent>
                                    <div className="flex gap-2">
                                        <Button onClick={() => setIsCreateSheetOpen(true)}>
                                            Create Restaurant
                                        </Button>
                                    </div>
                                </EmptyContent>
                            </Empty>
                        </div>
                    ) : !loading && filteredRestaurants.length === 0 && searchTerm ? (
                        <div className="p-6">
                            <Empty>
                                <EmptyHeader>
                                    <EmptyMedia variant="icon">
                                        <Search />
                                    </EmptyMedia>
                                    <EmptyTitle>No results</EmptyTitle>
                                    <EmptyDescription>
                                        No restaurants match{" "}
                                        <span className="font-semibold">
                                            &quot;{searchTerm}&quot;
                                        </span>
                                        . Try a different search term or clear the search.
                                    </EmptyDescription>
                                </EmptyHeader>
                                <EmptyContent>
                                    <div className="flex gap-2">
                                        <Button variant="outline" onClick={() => setSearchTerm("")}>
                                            Clear Search
                                        </Button>
                                    </div>
                                </EmptyContent>
                            </Empty>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader className="bg-foreground border-border sticky top-0 border-b">
                                <TableRow className="h-8">
                                    <TableHead className="bg-card sticky top-0 z-30 w-12 border-r text-center">
                                        #
                                    </TableHead>
                                    <TableHead className="bg-card sticky top-0 z-30 border-r px-2 sm:px-3 md:px-4">
                                        Name
                                    </TableHead>
                                    <TableHead className="bg-card sticky top-0 z-30 border-r px-2 sm:px-3 md:px-4">
                                        Location
                                    </TableHead>
                                    {/* Address column removed — shown in details and sheets instead */}
                                    <TableHead className="bg-card sticky top-0 z-30 border-r px-2 sm:px-3 md:px-4">
                                        Phone
                                    </TableHead>
                                    <TableHead className="bg-card sticky top-0 z-30 border-r px-2 sm:px-3 md:px-4">
                                        Email
                                    </TableHead>
                                    <TableHead className="bg-card sticky top-0 z-30 border-r px-2 text-center sm:px-3 md:px-4">
                                        Status
                                    </TableHead>
                                    <TableHead className="bg-card sticky top-0 z-30 border-r px-2 text-center shadow-sm sm:px-3 md:px-4">
                                        Created At
                                    </TableHead>
                                    <TableHead className="bg-card sticky top-0 z-30 w-[50px] text-center"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading
                                    ? Array.from({ length: 5 }).map((_, i) => (
                                          <TableRow key={i} className="h-10">
                                              <TableCell className="border-r px-2 text-center sm:px-3 md:px-4">
                                                  <Skeleton className="mx-auto h-4 w-6" />
                                              </TableCell>
                                              <TableCell className="border-r px-2 sm:px-3 md:px-4">
                                                  <Skeleton className="h-4 w-32" />
                                              </TableCell>
                                              <TableCell className="border-r px-2 sm:px-3 md:px-4">
                                                  <Skeleton className="h-4 w-24" />
                                              </TableCell>
                                              <TableCell className="border-r px-2 sm:px-3 md:px-4">
                                                  <Skeleton className="h-4 w-28" />
                                              </TableCell>
                                              <TableCell className="border-r px-2 sm:px-3 md:px-4">
                                                  <Skeleton className="h-4 w-36" />
                                              </TableCell>
                                              <TableCell className="border-r px-2 text-center sm:px-3 md:px-4">
                                                  <Skeleton className="h-4 w-16" />
                                              </TableCell>
                                              <TableCell className="border-r px-2 text-center sm:px-3 md:px-4">
                                                  <Skeleton className="h-4 w-24" />
                                              </TableCell>
                                              <TableCell className="px-2 sm:px-3 md:px-4">
                                                  <Skeleton className="h-8 w-8" />
                                              </TableCell>
                                          </TableRow>
                                      ))
                                    : filteredRestaurants.map(
                                          (restaurant: Restaurant, idx: number) => (
                                              <TableRow
                                                  key={restaurant.id}
                                                  className="hover:bg-muted/50 h-10 cursor-pointer"
                                                  onClick={() =>
                                                      router.push(
                                                          `/restaurant/${restaurant.id}/orders`,
                                                      )
                                                  }
                                              >
                                                  <TableCell className="border-r px-2 text-center sm:px-3 md:px-4">
                                                      <div className="text-muted-foreground text-sm">
                                                          {(currentPage - 1) * pageSize + idx + 1}
                                                      </div>
                                                  </TableCell>
                                                  <TableCell className="border-r px-2 font-medium sm:px-3 md:px-4">
                                                      <div className="flex items-center gap-2">
                                                          <div
                                                              className={`h-2 w-2 rounded-full ${restaurant.isActive ? "bg-green-500" : "bg-gray-400"}`}
                                                          />
                                                          {restaurant.name}
                                                      </div>
                                                  </TableCell>
                                                  <TableCell className="text-muted-foreground border-r px-2 sm:px-3 md:px-4">
                                                      {restaurant.city}, {restaurant.location}
                                                  </TableCell>
                                                  {/* address removed from table row */}
                                                  <TableCell className="text-muted-foreground border-r px-2 sm:px-3 md:px-4">
                                                      {restaurant.phone || "-"}
                                                  </TableCell>
                                                  <TableCell className="text-muted-foreground border-r px-2 sm:px-3 md:px-4">
                                                      {restaurant.email || "-"}
                                                  </TableCell>
                                                  <TableCell className="border-r px-2 text-center sm:px-3 md:px-4">
                                                      <Badge
                                                          variant={
                                                              restaurant.isActive
                                                                  ? "secondary"
                                                                  : "destructive"
                                                          }
                                                      >
                                                          {restaurant.isActive
                                                              ? "Active"
                                                              : "Inactive"}
                                                      </Badge>
                                                  </TableCell>
                                                  <TableCell className="text-muted-foreground border-r px-2 text-center sm:px-3 md:px-4">
                                                      {new Date(
                                                          restaurant.createdAt,
                                                      ).toLocaleDateString()}
                                                  </TableCell>
                                                  <TableCell
                                                      className="text-center"
                                                      onClick={(e) => e.stopPropagation()}
                                                  >
                                                      <DropdownMenu>
                                                          <DropdownMenuTrigger asChild>
                                                              <Button
                                                                  variant="ghost"
                                                                  size="icon"
                                                                  className="h-8 w-8"
                                                              >
                                                                  <MoreVertical className="h-4 w-4" />
                                                              </Button>
                                                          </DropdownMenuTrigger>
                                                          <DropdownMenuContent align="end">
                                                              <DropdownMenuItem
                                                                  onClick={() =>
                                                                      openEditSheet(restaurant)
                                                                  }
                                                              >
                                                                  <Edit className="h-4 w-4" />
                                                                  Edit
                                                              </DropdownMenuItem>
                                                              <DropdownMenuItem
                                                                  onClick={() =>
                                                                      setDeletingRestaurant(
                                                                          restaurant,
                                                                      )
                                                                  }
                                                              >
                                                                  <Trash2 className="h-4 w-4" />
                                                                  Delete
                                                              </DropdownMenuItem>
                                                          </DropdownMenuContent>
                                                      </DropdownMenu>
                                                  </TableCell>
                                              </TableRow>
                                          ),
                                      )}
                            </TableBody>
                        </Table>
                    )}
                </div>
            </div>

            {/* Pagination */}
            {loading ? (
                <div className="bg-background flex items-center justify-end px-3 py-3">
                    <div className="flex gap-1">
                        <Skeleton className="h-8 w-8" />
                        <Skeleton className="h-8 w-8" />
                        <Skeleton className="h-8 w-8" />
                        <Skeleton className="h-8 w-8" />
                        <Skeleton className="h-8 w-8" />
                    </div>
                </div>
            ) : (
                (currentPage > 1 || hasNextPage) && (
                    <div className="bg-background flex items-center justify-between">
                        <div className="text-muted-foreground text-sm whitespace-nowrap">
                            Page {currentPage} of {totalPages} • {totalCount} total restaurants
                        </div>
                        <Pagination className="justify-end">
                            <PaginationContent className="gap-1">
                                <PaginationItem>
                                    <PaginationPrevious
                                        onClick={() =>
                                            currentPage > 1 && setCurrentPage(currentPage - 1)
                                        }
                                        className={
                                            currentPage <= 1
                                                ? "pointer-events-none opacity-50"
                                                : "cursor-pointer"
                                        }
                                    />
                                </PaginationItem>

                                {/* First page */}
                                {currentPage > 3 && (
                                    <PaginationItem>
                                        <PaginationLink
                                            onClick={() => setCurrentPage(1)}
                                            className="h-8 w-8 cursor-pointer p-0"
                                        >
                                            1
                                        </PaginationLink>
                                    </PaginationItem>
                                )}

                                {/* Ellipsis before current range */}
                                {currentPage > 4 && (
                                    <PaginationItem>
                                        <PaginationEllipsis />
                                    </PaginationItem>
                                )}

                                {/* Previous page */}
                                {currentPage > 1 && (
                                    <PaginationItem>
                                        <PaginationLink
                                            onClick={() => setCurrentPage(currentPage - 1)}
                                            className="h-8 w-8 cursor-pointer p-0"
                                        >
                                            {currentPage - 1}
                                        </PaginationLink>
                                    </PaginationItem>
                                )}

                                {/* Current page */}
                                <PaginationItem>
                                    <PaginationLink isActive className="h-8 w-8 p-0">
                                        {currentPage}
                                    </PaginationLink>
                                </PaginationItem>

                                {/* Next page */}
                                {hasNextPage && (
                                    <PaginationItem>
                                        <PaginationLink
                                            onClick={() => setCurrentPage(currentPage + 1)}
                                            className="h-8 w-8 cursor-pointer p-0"
                                        >
                                            {currentPage + 1}
                                        </PaginationLink>
                                    </PaginationItem>
                                )}

                                {/* Ellipsis after current range */}
                                {currentPage < totalPages - 3 && (
                                    <PaginationItem>
                                        <PaginationEllipsis />
                                    </PaginationItem>
                                )}

                                {/* Last page */}
                                {currentPage < totalPages - 2 && (
                                    <PaginationItem>
                                        <PaginationLink
                                            onClick={() => setCurrentPage(totalPages)}
                                            className="h-8 w-8 cursor-pointer p-0"
                                        >
                                            {totalPages}
                                        </PaginationLink>
                                    </PaginationItem>
                                )}

                                <PaginationItem>
                                    <PaginationNext
                                        onClick={() =>
                                            hasNextPage && setCurrentPage(currentPage + 1)
                                        }
                                        className={
                                            !hasNextPage
                                                ? "pointer-events-none opacity-50"
                                                : "cursor-pointer"
                                        }
                                    />
                                </PaginationItem>
                            </PaginationContent>
                        </Pagination>
                    </div>
                )
            )}

            {/* Edit Sheet */}
            <Sheet open={!!editingRestaurant} onOpenChange={() => setEditingRestaurant(null)}>
                <SheetContent>
                    <SheetHeader className="border-border border-b">
                        <SheetTitle>Edit Restaurant</SheetTitle>
                        <SheetDescription>Update restaurant information.</SheetDescription>
                    </SheetHeader>

                    <Form {...editForm}>
                        <form
                            id="edit-form"
                            onSubmit={editForm.handleSubmit(handleEdit)}
                            className="space-y-4 p-4"
                        >
                            <FormField
                                control={editForm.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>
                                            Name <span className="text-destructive">*</span>
                                        </FormLabel>
                                        <FormControl>
                                            <Input {...field} placeholder="Ex: Spice Garden" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={editForm.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Description</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                {...field}
                                                placeholder="Short description (optional)"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={editForm.control}
                                name="address"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>
                                            Address <span className="text-destructive">*</span>
                                        </FormLabel>
                                        <FormControl>
                                            <Input {...field} placeholder="123 Main St" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={editForm.control}
                                name="city"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>
                                            City <span className="text-destructive">*</span>
                                        </FormLabel>
                                        <FormControl>
                                            <Input {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={editForm.control}
                                name="location"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>
                                            Location <span className="text-destructive">*</span>
                                        </FormLabel>
                                        <FormControl>
                                            <Input {...field} placeholder="Ex: Downtown" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={editForm.control}
                                name="phone"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Phone</FormLabel>
                                        <FormControl>
                                            <Input
                                                {...field}
                                                placeholder="Optional — +1 555-555-555"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={editForm.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Email</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="email"
                                                {...field}
                                                placeholder="Optional — contact@restaurant.com"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={editForm.control}
                                name="isActive"
                                render={({ field }) => (
                                    <FormItem className="flex items-center justify-between">
                                        <div>
                                            <FormLabel>Active</FormLabel>
                                            <FormDescription className="text-muted-foreground mt-1 text-sm">
                                                Whether the restaurant accepts orders
                                            </FormDescription>
                                        </div>
                                        <FormControl>
                                            <Switch
                                                checked={!!field.value}
                                                onCheckedChange={(val) => field.onChange(val)}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </form>
                    </Form>

                    <SheetFooter className="border-border border-t">
                        <Button type="submit" form="edit-form" disabled={updating}>
                            {updating ? (
                                <span className="flex items-center">
                                    <Spinner className="mr-2" /> Saving
                                </span>
                            ) : (
                                "Save changes"
                            )}
                        </Button>
                        <SheetClose asChild>
                            <Button variant="outline" disabled={updating}>
                                Close
                            </Button>
                        </SheetClose>
                    </SheetFooter>
                </SheetContent>
            </Sheet>

            {/* Delete Dialog */}
            <Dialog open={!!deletingRestaurant} onOpenChange={() => setDeletingRestaurant(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Restaurant</DialogTitle>
                        <DialogDescription>
                            This action cannot be undone. To confirm deletion, please enter the
                            restaurant name and location below.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-6">
                        <div>
                            <Alert variant="destructive">
                                <AlertDescription>
                                    This will permanently delete the restaurant and related
                                    resources like menu items, orders and analytics.
                                </AlertDescription>
                            </Alert>
                        </div>

                        <div className="space-y-3">
                            <Label htmlFor="delete-name">
                                To confirm, type{" "}
                                <span className="font-semibold">
                                    &quot;{deletingRestaurant?.name}&quot;
                                </span>
                            </Label>
                            <Input
                                id="delete-name"
                                value={deleteConfirmName}
                                onChange={(e) => setDeleteConfirmName(e.target.value)}
                                placeholder={`Type ${deletingRestaurant?.name}`}
                            />
                        </div>

                        <div className="space-y-3">
                            <Label htmlFor="delete-phrase">
                                To confirm, type{" "}
                                <span className="font-semibold">
                                    &quot;delete my restaurant&quot;
                                </span>
                            </Label>
                            <Input
                                id="delete-phrase"
                                value={deleteConfirmPhrase}
                                onChange={(e) => setDeleteConfirmPhrase(e.target.value)}
                                placeholder="Type delete my restaurant"
                            />
                        </div>
                    </div>
                    <DialogFooter className="flex w-full sm:justify-between">
                        <Button
                            variant="outline"
                            onClick={() => setDeletingRestaurant(null)}
                            disabled={deleting}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={
                                deleting ||
                                deleteConfirmName !== deletingRestaurant?.name ||
                                deleteConfirmPhrase !== "delete my restaurant"
                            }
                        >
                            {deleting ? (
                                <span className="flex items-center">
                                    <Spinner className="mr-2" /> Deleting
                                </span>
                            ) : (
                                "Delete Restaurant"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
