"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useQuery, useMutation } from "@apollo/client/react";
import { gql } from "@apollo/client/core";
import { Plus, Search, MoreVertical, Edit, Trash2, X, Eye } from "lucide-react";
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
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
import extractErrorMessage from "@/lib/errors";

const GET_MENU_ITEMS = gql`
    query GetMenuItems($restaurantId: ID, $first: Int, $skip: Int) {
        menuItems(restaurantId: $restaurantId, first: $first, skip: $skip) {
            menuItems {
                id
                name
                description
                price
                imageUrl
                isAvailable
                category
                createdAt
            }
            totalCount
        }
    }
`;

const CREATE_MENU_ITEM = gql`
    mutation CreateMenuItem($input: CreateMenuItemInput!) {
        createMenuItem(input: $input) {
            id
            name
            description
            price
            imageUrl
            isAvailable
            category
            createdAt
        }
    }
`;

const UPDATE_MENU_ITEM = gql`
    mutation UpdateMenuItem($id: ID!, $input: UpdateMenuItemInput!) {
        updateMenuItem(id: $id, input: $input) {
            id
            name
            description
            price
            imageUrl
            isAvailable
            category
        }
    }
`;

const DELETE_MENU_ITEM = gql`
    mutation DeleteMenuItem($id: ID!) {
        deleteMenuItem(id: $id)
    }
`;

const GET_MENU_CATEGORIES = gql`
    query GetMenuCategories($restaurantId: ID!) {
        menuCategories(restaurantId: $restaurantId)
    }
`;

const menuItemSchema = z.object({
    name: z.string().min(1, "Name is required"),
    description: z.string().optional(),
    price: z.number().min(0, "Price must be positive"),
    imageUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
    category: z.string().optional(),
    isAvailable: z.boolean().optional(),
});

type MenuItem = {
    id: string;
    name: string;
    description?: string;
    price: number;
    imageUrl?: string;
    isAvailable: boolean;
    category?: string;
    createdAt: string;
};

type MenuItemsData = {
    menuItems: {
        menuItems: MenuItem[];
        totalCount: number;
    };
};

export default function MenuManagementPage() {
    const params = useParams();
    const restaurantId = params.id as string;

    const [searchTerm, setSearchTerm] = useState("");
    const [categoryFilter, setCategoryFilter] = useState<string>("");
    const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false);
    const [editingMenuItem, setEditingMenuItem] = useState<MenuItem | null>(null);
    const [deletingMenuItem, setDeletingMenuItem] = useState<MenuItem | null>(null);
    const [deleteConfirmName, setDeleteConfirmName] = useState("");
    const [deleteConfirmPhrase, setDeleteConfirmPhrase] = useState("");
    const [viewingMenuItem, setViewingMenuItem] = useState<MenuItem | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 20;

    const { data, loading, error, refetch } = useQuery<MenuItemsData>(GET_MENU_ITEMS, {
        variables: {
            restaurantId,
            first: pageSize,
            skip: (currentPage - 1) * pageSize,
        },
    });

    const { data: categoriesData } = useQuery<{ menuCategories: string[] }>(GET_MENU_CATEGORIES, {
        variables: { restaurantId },
    });

    const totalCount = data?.menuItems?.totalCount ?? 0;
    const totalPages = Math.ceil(totalCount / pageSize);
    const hasNextPage = currentPage < totalPages;

    useEffect(() => {
        if (error) {
            const msg = extractErrorMessage(error);
            toast.error(`Failed to load menu items: ${msg}`);
        }
    }, [error]);

    const [createMenuItem, { loading: creating }] = useMutation(CREATE_MENU_ITEM);
    const [updateMenuItem, { loading: updating }] = useMutation(UPDATE_MENU_ITEM);
    const [deleteMenuItem, { loading: deleting }] = useMutation(DELETE_MENU_ITEM);

    const createForm = useForm<z.infer<typeof menuItemSchema>>({
        resolver: zodResolver(menuItemSchema),
        defaultValues: {
            name: "",
            description: "",
            price: 0,
            imageUrl: "",
            category: "",
        },
    });

    const editForm = useForm<z.infer<typeof menuItemSchema>>({
        resolver: zodResolver(menuItemSchema),
        defaultValues: {
            name: "",
            description: "",
            price: 0,
            imageUrl: "",
            category: "",
            isAvailable: true,
        },
    });

    const filteredMenuItems =
        data?.menuItems?.menuItems
            ?.filter(
                (item: MenuItem) =>
                    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    item.category?.toLowerCase().includes(searchTerm.toLowerCase()),
            )
            .filter((item: MenuItem) => !categoryFilter || item.category === categoryFilter) || [];

    const handleCreate = async (values: z.infer<typeof menuItemSchema>) => {
        try {
            await createMenuItem({
                variables: {
                    input: {
                        name: values.name,
                        description: values.description || undefined,
                        price: values.price,
                        imageUrl: values.imageUrl || undefined,
                        category: values.category || undefined,
                        restaurantId,
                    },
                },
            });
            toast.success("Menu item created successfully");
            setIsCreateSheetOpen(false);
            createForm.reset();
            refetch();
        } catch (error) {
            const msg = extractErrorMessage(error);
            toast.error(`Failed to create menu item: ${msg}`);
            console.error("Create menu item error:", error);
        }
    };

    const handleEdit = async (values: z.infer<typeof menuItemSchema>) => {
        if (!editingMenuItem) return;
        try {
            await updateMenuItem({
                variables: {
                    id: editingMenuItem.id,
                    input: {
                        name: values.name,
                        description: values.description || undefined,
                        price: values.price,
                        imageUrl: values.imageUrl || undefined,
                        category: values.category || undefined,
                        isAvailable: values.isAvailable,
                    },
                },
            });
            toast.success("Menu item updated successfully");
            setEditingMenuItem(null);
            editForm.reset();
            refetch();
        } catch (error) {
            const msg = extractErrorMessage(error);
            toast.error(`Failed to update menu item: ${msg}`);
            console.error("Update menu item error:", error);
        }
    };

    const handleDelete = async () => {
        if (!deletingMenuItem) return;
        const CONFIRM_PHRASE = "delete my menu item";
        if (deleteConfirmName !== deletingMenuItem.name || deleteConfirmPhrase !== CONFIRM_PHRASE) {
            toast.error("Confirmation details do not match");
            return;
        }
        try {
            await deleteMenuItem({
                variables: { id: deletingMenuItem.id },
            });
            toast.success("Menu item deleted successfully");
            setDeletingMenuItem(null);
            setDeleteConfirmName("");
            setDeleteConfirmPhrase("");
            refetch();
        } catch (error) {
            const msg = extractErrorMessage(error);
            toast.error(`Failed to delete menu item: ${msg}`);
            console.error("Delete menu item error:", error);
        }
    };

    const openEditSheet = (item: MenuItem) => {
        setEditingMenuItem(item);
        editForm.reset({
            name: item.name,
            description: item.description || "",
            price: item.price,
            imageUrl: item.imageUrl || "",
            category: item.category || "",
            isAvailable: item.isAvailable,
        });
    };

    if (error) {
        return (
            <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-semibold tracking-tight">Menu Management</h1>
                </div>
                <div className="py-8 text-center">
                    <p className="text-destructive">Failed to load menu items</p>
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
                <h1 className="text-2xl font-semibold tracking-tight">Menu Management</h1>
                <Sheet open={isCreateSheetOpen} onOpenChange={setIsCreateSheetOpen}>
                    <SheetTrigger asChild>
                        <Button size="sm">
                            <Plus className="h-4 w-4" />
                            New Menu Item
                        </Button>
                    </SheetTrigger>
                    <SheetContent className="sm:max-w-[425px]">
                        <SheetHeader className="border-border border-b">
                            <SheetTitle>Create Menu Item</SheetTitle>
                            <SheetDescription>
                                Add a new menu item to your restaurant.
                            </SheetDescription>
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
                                                <Input
                                                    {...field}
                                                    placeholder="Ex: Chicken Biryani"
                                                />
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
                                    name="price"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>
                                                Price <span className="text-destructive">*</span>
                                            </FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    {...field}
                                                    onChange={(e) =>
                                                        field.onChange(
                                                            parseFloat(e.target.value) || 0,
                                                        )
                                                    }
                                                    placeholder="0.00"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={createForm.control}
                                    name="category"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Category</FormLabel>
                                            <FormControl>
                                                <Input {...field} placeholder="Ex: Main Course" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={createForm.control}
                                    name="imageUrl"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Image URL</FormLabel>
                                            <FormControl>
                                                <Input
                                                    {...field}
                                                    placeholder="https://example.com/image.jpg"
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
                                    "Create Menu Item"
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

            <div className="flex gap-4">
                <div className="relative flex-1">
                    <Search className="text-muted-foreground absolute top-2.5 left-3 h-4 w-4" />
                    <Input
                        aria-label="Search menu items by name or category"
                        placeholder="Search menu items — name or category"
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
                <Select
                    value={categoryFilter || "all"}
                    onValueChange={(value) => setCategoryFilter(value === "all" ? "" : value)}
                >
                    <SelectTrigger className="sm:w-[180px]">
                        <SelectValue placeholder="Filter by category" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {categoriesData?.menuCategories?.map((category) => (
                            <SelectItem key={category} value={category}>
                                {category}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="min-h-0 overflow-hidden border">
                <div className="h-full min-h-0 overflow-auto">
                    {/* Empty states */}
                    {!loading && data?.menuItems?.menuItems?.length === 0 ? (
                        <div className="p-6">
                            <Empty>
                                <EmptyHeader>
                                    <EmptyMedia variant="icon">
                                        <Plus />
                                    </EmptyMedia>
                                    <EmptyTitle>No menu items yet</EmptyTitle>
                                    <EmptyDescription>
                                        {`You don't have any menu items added. Create a menu item to get started.`}
                                    </EmptyDescription>
                                </EmptyHeader>
                                <EmptyContent>
                                    <div className="flex gap-2">
                                        <Button onClick={() => setIsCreateSheetOpen(true)}>
                                            Create Menu Item
                                        </Button>
                                    </div>
                                </EmptyContent>
                            </Empty>
                        </div>
                    ) : !loading && filteredMenuItems.length === 0 && searchTerm ? (
                        <div className="p-6">
                            <Empty>
                                <EmptyHeader>
                                    <EmptyMedia variant="icon">
                                        <Search />
                                    </EmptyMedia>
                                    <EmptyTitle>No results</EmptyTitle>
                                    <EmptyDescription>
                                        No menu items match{" "}
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
                                    <TableHead className="bg-card sticky top-0 z-30 w-12 border-r px-1 text-center">
                                        #
                                    </TableHead>
                                    <TableHead className="bg-card sticky top-0 z-30 border-r px-2 sm:px-3 md:px-4">
                                        Name
                                    </TableHead>
                                    <TableHead className="bg-card sticky top-0 z-30 border-r px-2 sm:px-3 md:px-4">
                                        Category
                                    </TableHead>
                                    <TableHead className="bg-card sticky top-0 z-30 border-r px-2 sm:px-3 md:px-4">
                                        Price
                                    </TableHead>
                                    <TableHead className="bg-card sticky top-0 z-30 border-r px-2 text-center sm:px-3 md:px-4">
                                        Status
                                    </TableHead>
                                    <TableHead className="bg-card sticky top-0 z-30 border-r px-2 text-center sm:px-3 md:px-4">
                                        Created At
                                    </TableHead>
                                    <TableHead className="bg-card sticky top-0 z-30 w-[50px] px-1 text-center"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading
                                    ? Array.from({ length: 5 }).map((_, i) => (
                                          <TableRow key={i} className="h-10">
                                              <TableCell className="border-r px-1 text-center">
                                                  <Skeleton className="mx-auto h-3 w-4" />
                                              </TableCell>
                                              <TableCell className="border-r px-2 sm:px-3 md:px-4">
                                                  <Skeleton className="h-3 w-32" />
                                              </TableCell>
                                              <TableCell className="border-r px-2 sm:px-3 md:px-4">
                                                  <Skeleton className="h-3 w-24" />
                                              </TableCell>
                                              <TableCell className="border-r px-2 sm:px-3 md:px-4">
                                                  <Skeleton className="h-3 w-12" />
                                              </TableCell>
                                              <TableCell className="border-r px-2 text-center sm:px-3 md:px-4">
                                                  <Skeleton className="mx-auto h-4 w-16" />
                                              </TableCell>
                                              <TableCell className="border-r px-2 text-center sm:px-3 md:px-4">
                                                  <Skeleton className="mx-auto h-3 w-20" />
                                              </TableCell>
                                              <TableCell className="px-1 text-center">
                                                  <Skeleton className="mx-auto h-6 w-6" />
                                              </TableCell>
                                          </TableRow>
                                      ))
                                    : filteredMenuItems.map((item: MenuItem, idx: number) => (
                                          <TableRow
                                              key={item.id}
                                              className="hover:bg-muted/50 h-10 cursor-pointer"
                                              onClick={() => setViewingMenuItem(item)}
                                          >
                                              <TableCell className="border-r px-1 text-center">
                                                  <div className="text-muted-foreground text-xs">
                                                      {(currentPage - 1) * pageSize + idx + 1}
                                                  </div>
                                              </TableCell>
                                              <TableCell className="border-r px-2 font-medium sm:px-3 md:px-4">
                                                  <div className="flex items-center gap-2">
                                                      <div
                                                          className={`h-2 w-2 rounded-full ${item.isAvailable ? "bg-green-500" : "bg-gray-400"}`}
                                                      />
                                                      <span
                                                          className="max-w-40 truncate text-xs md:max-w-none md:overflow-visible md:text-sm"
                                                          title={item.name}
                                                      >
                                                          {item.name}
                                                      </span>
                                                  </div>
                                              </TableCell>
                                              <TableCell className="text-muted-foreground border-r px-2 sm:px-3 md:px-4">
                                                  <span
                                                      className="max-w-24 truncate text-xs md:max-w-none md:overflow-visible md:text-sm"
                                                      title={item.category || "-"}
                                                  >
                                                      {item.category || "-"}
                                                  </span>
                                              </TableCell>
                                              <TableCell className="text-muted-foreground border-r px-2 text-sm font-medium sm:px-3 md:px-4">
                                                  ${item.price.toFixed(2)}
                                              </TableCell>
                                              <TableCell className="border-r px-2 text-center sm:px-3 md:px-4">
                                                  <Badge
                                                      variant={
                                                          item.isAvailable
                                                              ? "secondary"
                                                              : "destructive"
                                                      }
                                                      className="h-5 px-1.5 py-0.5 text-xs"
                                                  >
                                                      {item.isAvailable
                                                          ? "Available"
                                                          : "Unavailable"}
                                                  </Badge>
                                              </TableCell>
                                              <TableCell className="text-muted-foreground border-r px-2 text-center text-xs sm:px-3 md:px-4">
                                                  {new Date(item.createdAt).toLocaleDateString()}
                                              </TableCell>
                                              <TableCell
                                                  className="px-1 text-center"
                                                  onClick={(e) => e.stopPropagation()}
                                              >
                                                  <DropdownMenu>
                                                      <DropdownMenuTrigger asChild>
                                                          <Button
                                                              variant="ghost"
                                                              size="icon"
                                                              className="h-6 w-6"
                                                          >
                                                              <MoreVertical className="h-3 w-3" />
                                                          </Button>
                                                      </DropdownMenuTrigger>
                                                      <DropdownMenuContent align="end">
                                                          <DropdownMenuItem
                                                              onClick={() =>
                                                                  setViewingMenuItem(item)
                                                              }
                                                          >
                                                              <Eye className="h-4 w-4" />
                                                              View Details
                                                          </DropdownMenuItem>
                                                          <DropdownMenuItem
                                                              onClick={() => openEditSheet(item)}
                                                          >
                                                              <Edit className="h-4 w-4" />
                                                              Edit
                                                          </DropdownMenuItem>
                                                          <DropdownMenuItem
                                                              onClick={() =>
                                                                  setDeletingMenuItem(item)
                                                              }
                                                              variant="destructive"
                                                          >
                                                              <Trash2 className="h-4 w-4" />
                                                              Delete
                                                          </DropdownMenuItem>
                                                      </DropdownMenuContent>
                                                  </DropdownMenu>
                                              </TableCell>
                                          </TableRow>
                                      ))}
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
                    <div className="bg-background flex items-center justify-between px-3 py-3">
                        <div className="text-muted-foreground text-sm whitespace-nowrap">
                            Page {currentPage} of {totalPages} • {totalCount} total menu items
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
            <Sheet open={!!editingMenuItem} onOpenChange={() => setEditingMenuItem(null)}>
                <SheetContent>
                    <SheetHeader className="border-border border-b">
                        <SheetTitle>Edit Menu Item</SheetTitle>
                        <SheetDescription>Update menu item information.</SheetDescription>
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
                                            <Input {...field} placeholder="Ex: Chicken Biryani" />
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
                                name="price"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>
                                            Price <span className="text-destructive">*</span>
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                {...field}
                                                onChange={(e) =>
                                                    field.onChange(parseFloat(e.target.value) || 0)
                                                }
                                                placeholder="0.00"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={editForm.control}
                                name="category"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Category</FormLabel>
                                        <FormControl>
                                            <Input {...field} placeholder="Ex: Main Course" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={editForm.control}
                                name="imageUrl"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Image URL</FormLabel>
                                        <FormControl>
                                            <Input
                                                {...field}
                                                placeholder="https://example.com/image.jpg"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={editForm.control}
                                name="isAvailable"
                                render={({ field }) => (
                                    <FormItem className="flex items-center justify-between">
                                        <div>
                                            <FormLabel>Available</FormLabel>
                                            <FormDescription className="text-muted-foreground mt-1 text-sm">
                                                Whether the menu item is available for ordering
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

            {/* View Details Sheet */}
            <Sheet open={!!viewingMenuItem} onOpenChange={() => setViewingMenuItem(null)}>
                <SheetContent>
                    <div className="flex h-full flex-col">
                        <SheetHeader className="border-b px-6 pb-4">
                            <SheetTitle className="flex items-center gap-2">
                                <Eye className="h-5 w-5" />
                                Menu Item Details
                            </SheetTitle>
                            <SheetDescription className="text-base">
                                {viewingMenuItem?.name} • Created{" "}
                                {viewingMenuItem &&
                                    new Date(viewingMenuItem.createdAt).toLocaleString()}
                            </SheetDescription>
                        </SheetHeader>

                        <div className="flex-1 overflow-y-auto px-6 py-6">
                            {viewingMenuItem && (
                                <div className="space-y-6">
                                    {/* Basic Info */}
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <h4 className="text-muted-foreground text-sm font-semibold tracking-wide uppercase">
                                                Name
                                            </h4>
                                            <div className="text-base font-medium">
                                                {viewingMenuItem.name}
                                            </div>
                                        </div>

                                        {viewingMenuItem.description && (
                                            <div className="space-y-2">
                                                <h4 className="text-muted-foreground text-sm font-semibold tracking-wide uppercase">
                                                    Description
                                                </h4>
                                                <div className="bg-muted/50 rounded-md p-3 text-sm">
                                                    {viewingMenuItem.description}
                                                </div>
                                            </div>
                                        )}

                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <h4 className="text-muted-foreground text-sm font-semibold tracking-wide uppercase">
                                                    Price
                                                </h4>
                                                <div className="text-lg font-bold text-green-600">
                                                    ${viewingMenuItem.price.toFixed(2)}
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <h4 className="text-muted-foreground text-sm font-semibold tracking-wide uppercase">
                                                    Status
                                                </h4>
                                                <Badge
                                                    variant={
                                                        viewingMenuItem.isAvailable
                                                            ? "secondary"
                                                            : "destructive"
                                                    }
                                                    className="w-fit"
                                                >
                                                    {viewingMenuItem.isAvailable
                                                        ? "Available"
                                                        : "Unavailable"}
                                                </Badge>
                                            </div>
                                        </div>

                                        {viewingMenuItem.category && (
                                            <div className="space-y-2">
                                                <h4 className="text-muted-foreground text-sm font-semibold tracking-wide uppercase">
                                                    Category
                                                </h4>
                                                <div className="bg-muted/50 inline-block rounded-md px-3 py-2 text-sm">
                                                    {viewingMenuItem.category}
                                                </div>
                                            </div>
                                        )}

                                        <div className="space-y-2">
                                            <h4 className="text-muted-foreground text-sm font-semibold tracking-wide uppercase">
                                                Image
                                            </h4>
                                            <div className="bg-muted/50 rounded-md p-3">
                                                <Image
                                                    src={
                                                        viewingMenuItem.imageUrl ||
                                                        "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?q=80&w=2070&auto=format&fit=crop"
                                                    }
                                                    alt={viewingMenuItem.name}
                                                    width={400}
                                                    height={192}
                                                    className="h-48 w-full max-w-sm rounded-md object-cover"
                                                    onError={(e) => {
                                                        e.currentTarget.src =
                                                            "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?q=80&w=2070&auto=format&fit=crop";
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <SheetFooter className="border-t px-6 pt-4">
                            <SheetClose asChild>
                                <Button variant="outline" className="w-full">
                                    Close
                                </Button>
                            </SheetClose>
                        </SheetFooter>
                    </div>
                </SheetContent>
            </Sheet>

            {/* Delete Dialog */}
            <Dialog open={!!deletingMenuItem} onOpenChange={() => setDeletingMenuItem(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Menu Item</DialogTitle>
                        <DialogDescription>
                            This action cannot be undone. To confirm deletion, please enter the menu
                            item name and location below.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-6">
                        <div>
                            <Alert variant="destructive">
                                <AlertDescription>
                                    This will permanently delete the menu item and related resources
                                    like orders.
                                </AlertDescription>
                            </Alert>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="delete-name">
                                To confirm, type{" "}
                                <span className="font-semibold">
                                    &quot;{deletingMenuItem?.name}&quot;
                                </span>
                            </Label>
                            <Input
                                id="delete-name"
                                value={deleteConfirmName}
                                onChange={(e) => setDeleteConfirmName(e.target.value)}
                                placeholder={`Type ${deletingMenuItem?.name}`}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="delete-phrase">
                                To confirm, type{" "}
                                <span className="font-semibold">
                                    &quot;delete my menu item&quot;
                                </span>
                            </Label>
                            <Input
                                id="delete-phrase"
                                value={deleteConfirmPhrase}
                                onChange={(e) => setDeleteConfirmPhrase(e.target.value)}
                                placeholder="Type delete my menu item"
                            />
                        </div>
                    </div>
                    <DialogFooter className="flex w-full sm:justify-between">
                        <Button
                            variant="outline"
                            onClick={() => setDeletingMenuItem(null)}
                            disabled={deleting}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={
                                deleting ||
                                deleteConfirmName !== deletingMenuItem?.name ||
                                deleteConfirmPhrase !== "delete my menu item"
                            }
                        >
                            {deleting ? (
                                <span className="flex items-center">
                                    <Spinner className="mr-2" /> Deleting
                                </span>
                            ) : (
                                "Delete Menu Item"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
