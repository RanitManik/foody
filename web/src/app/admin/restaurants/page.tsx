"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { gql } from "@apollo/client/core";
import { useRouter } from "next/navigation";
import { Plus, Search, MoreVertical, Edit, Trash2 } from "lucide-react";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
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

const GET_RESTAURANTS = gql`
    query GetRestaurants($first: Int, $skip: Int) {
        restaurants(first: $first, skip: $skip) {
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
    restaurants: Restaurant[];
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

    const { data, loading, error, refetch } = useQuery<RestaurantsData>(GET_RESTAURANTS, {
        variables: { first: 100, skip: 0 },
    });

    const [createRestaurant] = useMutation(CREATE_RESTAURANT);
    const [updateRestaurant] = useMutation(UPDATE_RESTAURANT);
    const [deleteRestaurant] = useMutation(DELETE_RESTAURANT);

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
        data?.restaurants?.filter(
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
                        ...values,
                        email: values.email || undefined,
                        phone: values.phone || undefined,
                        description: values.description || undefined,
                    },
                },
            });
            toast.success("Restaurant created successfully");
            setIsCreateSheetOpen(false);
            createForm.reset();
            refetch();
        } catch (error) {
            toast.error("Failed to create restaurant");
            console.error(error);
        }
    };

    const handleEdit = async (values: z.infer<typeof restaurantSchema>) => {
        if (!editingRestaurant) return;
        try {
            await updateRestaurant({
                variables: {
                    id: editingRestaurant.id,
                    input: {
                        ...values,
                        email: values.email || undefined,
                        phone: values.phone || undefined,
                        description: values.description || undefined,
                    },
                },
            });
            toast.success("Restaurant updated successfully");
            setEditingRestaurant(null);
            editForm.reset();
            refetch();
        } catch (error) {
            toast.error("Failed to update restaurant");
            console.error(error);
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
            toast.error("Failed to delete restaurant");
            console.error(error);
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
        <div className="grid h-full min-h-0 grid-rows-[auto_auto_1fr] gap-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-semibold tracking-tight">Restaurants</h1>
                <Sheet open={isCreateSheetOpen} onOpenChange={setIsCreateSheetOpen}>
                    <SheetTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
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
                            </form>
                        </Form>
                        <SheetFooter className="border-border border-t">
                            <Button type="submit" form="create-form">
                                Create Restaurant
                            </Button>
                            <SheetClose asChild>
                                <Button variant="outline">Close</Button>
                            </SheetClose>
                        </SheetFooter>
                    </SheetContent>
                </Sheet>
            </div>

            <div className="relative">
                <Search className="text-muted-foreground absolute top-3 left-3 h-4 w-4" />
                <Input
                    placeholder="Search restaurants..."
                    className="pl-9"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="min-h-0 overflow-hidden border">
                <div className="h-full min-h-0 overflow-auto">
                    <Table>
                        {/* make header opaque so the bottom border stays visible while sticky */}
                        <TableHeader className="bg-card border-border sticky top-0 border-b">
                            <TableRow>
                                <TableHead className="bg-card sticky top-0 z-30 border-r">
                                    Name
                                </TableHead>
                                <TableHead className="bg-card sticky top-0 z-30 border-r">
                                    Location
                                </TableHead>
                                {/* Address column removed — shown in details and sheets instead */}
                                <TableHead className="bg-card sticky top-0 z-30 border-r">
                                    Phone
                                </TableHead>
                                <TableHead className="bg-card sticky top-0 z-30 border-r">
                                    Email
                                </TableHead>
                                <TableHead className="bg-card sticky top-0 z-30 border-r text-center">
                                    Status
                                </TableHead>
                                <TableHead className="bg-card sticky top-0 z-30 border-r text-center shadow-sm">
                                    Created At
                                </TableHead>
                                <TableHead className="bg-card sticky top-0 z-30 w-[50px] text-center"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading
                                ? Array.from({ length: 5 }).map((_, i) => (
                                      <TableRow key={i}>
                                          <TableCell className="border-r">
                                              <Skeleton className="h-4 w-32" />
                                          </TableCell>
                                          <TableCell className="border-r">
                                              <Skeleton className="h-4 w-24" />
                                          </TableCell>
                                          <TableCell className="border-r">
                                              <Skeleton className="h-4 w-28" />
                                          </TableCell>
                                          <TableCell className="border-r">
                                              <Skeleton className="h-4 w-36" />
                                          </TableCell>
                                          <TableCell className="border-r text-center">
                                              <Skeleton className="h-4 w-16" />
                                          </TableCell>
                                          <TableCell className="border-r text-center">
                                              <Skeleton className="h-4 w-24" />
                                          </TableCell>
                                          <TableCell>
                                              <Skeleton className="h-8 w-8" />
                                          </TableCell>
                                      </TableRow>
                                  ))
                                : filteredRestaurants.map((restaurant: Restaurant) => (
                                      <TableRow
                                          key={restaurant.id}
                                          className="hover:bg-muted/50 cursor-pointer"
                                          onClick={() =>
                                              router.push(`/restaurant/${restaurant.id}/dashboard`)
                                          }
                                      >
                                          <TableCell className="border-r font-medium">
                                              <div className="flex items-center gap-2">
                                                  <div
                                                      className={`h-2 w-2 rounded-full ${restaurant.isActive ? "bg-green-500" : "bg-gray-400"}`}
                                                  />
                                                  {restaurant.name}
                                              </div>
                                          </TableCell>
                                          <TableCell className="text-muted-foreground border-r">
                                              {restaurant.city}, {restaurant.location}
                                          </TableCell>
                                          {/* address removed from table row */}
                                          <TableCell className="text-muted-foreground border-r">
                                              {restaurant.phone || "-"}
                                          </TableCell>
                                          <TableCell className="text-muted-foreground border-r">
                                              {restaurant.email || "-"}
                                          </TableCell>
                                          <TableCell className="border-r text-center">
                                              <Badge
                                                  variant={
                                                      restaurant.isActive ? "default" : "secondary"
                                                  }
                                              >
                                                  {restaurant.isActive ? "Active" : "Inactive"}
                                              </Badge>
                                          </TableCell>
                                          <TableCell className="text-muted-foreground border-r text-center">
                                              {new Date(restaurant.createdAt).toLocaleDateString()}
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
                                                          onClick={() => openEditSheet(restaurant)}
                                                      >
                                                          <Edit className="mr-2 h-4 w-4" />
                                                          Edit
                                                      </DropdownMenuItem>
                                                      <DropdownMenuItem
                                                          onClick={() =>
                                                              setDeletingRestaurant(restaurant)
                                                          }
                                                          className="text-destructive"
                                                      >
                                                          <Trash2 className="mr-2 h-4 w-4" />
                                                          Delete
                                                      </DropdownMenuItem>
                                                  </DropdownMenuContent>
                                              </DropdownMenu>
                                          </TableCell>
                                      </TableRow>
                                  ))}
                        </TableBody>
                    </Table>
                </div>
            </div>

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
                        <Button type="submit" form="edit-form">
                            Save changes
                        </Button>
                        <SheetClose asChild>
                            <Button variant="outline">Close</Button>
                        </SheetClose>
                    </SheetFooter>
                </SheetContent>
            </Sheet>

            {/* Delete Dialog */}
            <Dialog open={!!deletingRestaurant} onOpenChange={() => setDeletingRestaurant(null)}>
                <DialogContent>
                    <DialogHeader className="pb-2">
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
                        <Button variant="outline" onClick={() => setDeletingRestaurant(null)}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={
                                deleteConfirmName !== deletingRestaurant?.name ||
                                deleteConfirmPhrase !== "delete my restaurant"
                            }
                        >
                            Delete Restaurant
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
