"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useParams, useSearchParams } from "next/navigation";
import { useRouter } from "nextjs-toploader/app";

import { useQuery, useMutation } from "@apollo/client/react";
import { gql } from "@apollo/client/core";
import {
    Plus,
    Minus,
    ShoppingCart,
    Save,
    X,
    Clock,
    CheckCircle,
    XCircle,
    Search,
    Trash2,
    Utensils,
} from "lucide-react";
import { toast } from "sonner";
import extractErrorMessage from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";

import { cn } from "@/lib/utils";

const GET_MENU_ITEMS = gql`
    query GetMenuItems($restaurantId: ID, $first: Int, $skip: Int) {
        menuItems(restaurantId: $restaurantId, first: $first, skip: $skip) {
            menuItems {
                id
                name
                description
                price
                isAvailable
                category
                imageUrl
            }
            totalCount
        }
    }
`;

const GET_MENU_CATEGORIES = gql`
    query GetMenuCategories($restaurantId: ID) {
        menuCategories(restaurantId: $restaurantId)
    }
`;

const GET_ORDER = gql`
    query GetOrder($id: ID!) {
        order(id: $id) {
            id
            status
            totalAmount
            phone
            specialInstructions
            items {
                id
                quantity
                price
                notes
                menuItem {
                    id
                    name
                    price
                    category
                    imageUrl
                }
            }
            createdAt
            updatedAt
        }
    }
`;

const CREATE_ORDER = gql`
    mutation CreateOrder($input: CreateOrderInput!) {
        createOrder(input: $input) {
            id
            status
            totalAmount
            phone
            specialInstructions
            items {
                id
                quantity
                price
                notes
                menuItem {
                    id
                    name
                    price
                    category
                }
            }
            createdAt
        }
    }
`;

interface MenuItem {
    id: string;
    name: string;
    description?: string;
    price: number;
    isAvailable: boolean;
    category: string;
    imageUrl?: string;
}

interface CartItem {
    menuItem: MenuItem;
    quantity: number;
    notes?: string;
}

interface OrderData {
    id: string;
    status: string;
    totalAmount: number;
    phone: string;
    specialInstructions?: string;
    items: Array<{
        id: string;
        quantity: number;
        price: number;
        notes?: string;
        menuItem: MenuItem;
    }>;
}

export default function CreateOrderPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();
    const restaurantId = params.id as string;
    const orderId = searchParams.get("orderId");

    const [cart, setCart] = useState<CartItem[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>("all");
    const [searchTerm, setSearchTerm] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isCartSheetOpen, setIsCartSheetOpen] = useState(false);
    const [allMenuItems, setAllMenuItems] = useState<MenuItem[]>([]);
    const [loadingMore, setLoadingMore] = useState(false);

    // Fetch menu items with pagination
    const {
        data: menuData,
        loading: menuLoading,
        fetchMore,
    } = useQuery(GET_MENU_ITEMS, {
        variables: {
            restaurantId,
            first: 50, // Start with 50 items
            skip: 0,
        },
    });

    const totalMenuItems =
        (menuData as { menuItems?: { totalCount: number } })?.menuItems?.totalCount ?? 0;
    const hasMoreMenuItems = allMenuItems.length < totalMenuItems;

    // Update allMenuItems when data changes
    useEffect(() => {
        const data = menuData as { menuItems?: { menuItems: MenuItem[] } };
        if (data?.menuItems?.menuItems && !menuLoading) {
            setAllMenuItems(data.menuItems.menuItems);
        }
    }, [menuData, menuLoading]);

    // Load more menu items
    const loadMoreMenuItems = async () => {
        if (loadingMore || !hasMoreMenuItems) return;

        setLoadingMore(true);
        try {
            const result = await fetchMore({
                variables: {
                    restaurantId,
                    first: 50,
                    skip: allMenuItems.length,
                },
                updateQuery: (prev, { fetchMoreResult }) => {
                    const prevData = prev as {
                        menuItems?: { menuItems: MenuItem[]; totalCount: number };
                    };
                    const fetchData = fetchMoreResult as {
                        menuItems?: { menuItems: MenuItem[]; totalCount: number };
                    };

                    if (!fetchData?.menuItems?.menuItems) return prev;

                    // Combine previous and new menu items
                    const newMenuItems = [
                        ...(prevData?.menuItems?.menuItems || []),
                        ...fetchData.menuItems.menuItems,
                    ];

                    return {
                        ...prevData,
                        menuItems: {
                            ...prevData?.menuItems,
                            menuItems: newMenuItems,
                            totalCount: fetchData.menuItems.totalCount,
                        },
                    };
                },
            });

            // Update local state
            const resultData = result.data as { menuItems?: { menuItems: MenuItem[] } };
            if (resultData?.menuItems?.menuItems) {
                setAllMenuItems((prev) => [...prev, ...resultData.menuItems!.menuItems]);
            }
        } catch (error) {
            console.error("Error loading more menu items:", error);
        } finally {
            setLoadingMore(false);
        }
    };

    // Fetch menu categories
    const { data: categoriesData } = useQuery(GET_MENU_CATEGORIES, {
        variables: { restaurantId },
    });

    // Fetch existing order if editing
    const { data: orderData, loading: orderLoading } = useQuery(GET_ORDER, {
        variables: { id: orderId },
        skip: !orderId,
    });

    const [createOrder] = useMutation(CREATE_ORDER, {
        update: (cache) => {
            cache.evict({ fieldName: "orders" });
            cache.gc();
        },
    });

    // Initialize form with existing order data
    useEffect(() => {
        if ((orderData as { order?: OrderData })?.order && !orderLoading) {
            const order = (orderData as { order: OrderData }).order;
            // Convert order items to cart items
            const cartItems: CartItem[] = order.items.map((item) => ({
                menuItem: item.menuItem,
                quantity: item.quantity,
                notes: item.notes,
            }));
            setCart(cartItems);
        }
    }, [orderData, orderLoading]);

    const categories = (categoriesData as { menuCategories?: string[] })?.menuCategories || [];

    const filteredMenuItems =
        selectedCategory === "all"
            ? allMenuItems.filter((item: MenuItem) =>
                  item.name.toLowerCase().includes(searchTerm.toLowerCase()),
              )
            : allMenuItems.filter(
                  (item: MenuItem) =>
                      item.category === selectedCategory &&
                      item.name.toLowerCase().includes(searchTerm.toLowerCase()),
              );

    const addToCart = (menuItem: MenuItem) => {
        setCart((prevCart) => {
            const existingItem = prevCart.find((item) => item.menuItem.id === menuItem.id);

            if (existingItem) {
                return prevCart.map((item) =>
                    item.menuItem.id === menuItem.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item,
                );
            } else {
                return [...prevCart, { menuItem, quantity: 1 }];
            }
        });
    };

    const updateQuantity = (menuItemId: string, quantity: number) => {
        if (quantity <= 0) {
            removeFromCart(menuItemId);
            return;
        }

        setCart((prevCart) =>
            prevCart.map((item) =>
                item.menuItem.id === menuItemId ? { ...item, quantity } : item,
            ),
        );
    };

    const removeFromCart = (menuItemId: string) => {
        setCart((prevCart) => prevCart.filter((item) => item.menuItem.id !== menuItemId));
    };

    const getCartItemQuantity = (menuItemId: string) => {
        const item = cart.find((item) => item.menuItem.id === menuItemId);
        return item ? item.quantity : 0;
    };

    const getTotalAmount = () => {
        return cart.reduce((total, item) => total + item.menuItem.price * item.quantity, 0);
    };

    const handleSubmit = async () => {
        if (cart.length === 0) {
            toast.error("Please add at least one item to the order");
            return;
        }

        setIsSubmitting(true);

        try {
            const orderInput = {
                items: cart.map((item) => ({
                    menuItemId: item.menuItem.id,
                    quantity: item.quantity,
                    notes: item.notes || "",
                })),
                phone: null,
                specialInstructions: null,
            };

            await createOrder({
                variables: { input: orderInput },
            });

            toast.success(orderId ? "Order updated successfully!" : "Order created successfully!");

            // Navigate back to orders page
            router.push(`/restaurant/${restaurantId}/orders`);
        } catch (error) {
            toast.error(extractErrorMessage(error));
        } finally {
            setIsSubmitting(false);
        }
    };

    if (orderLoading && orderId) {
        return (
            <div className="grid h-full min-h-0 grid-cols-1 gap-6 lg:grid-cols-[1fr_350px]">
                {/* Left Column: Title, Search, and Menu Items Skeleton */}
                <div className="flex min-h-0 flex-col">
                    <div className="mb-4 flex items-center justify-between">
                        <Skeleton className="h-8 w-32" />
                        <Skeleton className="h-6 w-20" />
                    </div>

                    <div className="mb-6 flex flex-col gap-4 sm:flex-row">
                        <Skeleton className="h-10 flex-1" />
                        <Skeleton className="h-10 w-full sm:w-[200px]" />
                    </div>

                    {/* Menu Items Grid Skeleton */}
                    <div className="min-h-0 flex-1">
                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {Array.from({ length: 8 }).map((_, i) => (
                                <Card
                                    key={i}
                                    className="gap-0 overflow-hidden border-none py-0 shadow-sm"
                                >
                                    <Skeleton className="aspect-video w-full rounded-t-lg" />
                                    <CardContent className="p-4">
                                        <Skeleton className="mb-2 h-6 w-3/4" />
                                        <Skeleton className="h-4 w-1/2" />
                                        <Skeleton className="mt-4 h-10 w-full" />
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Column: Order Summary Skeleton */}
                <div className="hidden h-full min-h-0 flex-col lg:flex">
                    <div className="bg-background flex h-full flex-col rounded-lg border shadow-sm">
                        {/* Cart Header Skeleton */}
                        <div className="bg-muted/20 border-b p-4">
                            <div className="flex items-center justify-between">
                                <Skeleton className="h-6 w-32" />
                                <Skeleton className="h-6 w-16" />
                            </div>
                        </div>

                        {/* Cart Items Skeleton */}
                        <div className="flex-1 p-4">
                            <div className="space-y-3">
                                {Array.from({ length: 3 }).map((_, i) => (
                                    <div
                                        key={i}
                                        className="bg-card flex gap-4 rounded-lg border p-3"
                                    >
                                        <Skeleton className="size-14 rounded-md" />
                                        <div className="flex-1 space-y-2">
                                            <div className="flex justify-between">
                                                <Skeleton className="h-5 w-24" />
                                                <Skeleton className="h-5 w-12" />
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <Skeleton className="h-4 w-4" />
                                                    <Skeleton className="h-4 w-4" />
                                                    <Skeleton className="h-4 w-4" />
                                                </div>
                                                <Skeleton className="h-6 w-6" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Footer Section Skeleton */}
                        <div className="bg-muted/20 space-y-3 border-t p-4">
                            <div className="flex justify-between">
                                <Skeleton className="h-6 w-12" />
                                <Skeleton className="h-6 w-16" />
                            </div>
                            <Skeleton className="h-10 w-full" />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="grid h-full min-h-0 grid-cols-1 gap-6 lg:grid-cols-[1fr_350px]">
                {/* Left Column: Title, Search, and Menu Items */}
                <div className="flex min-h-0 flex-col">
                    <div className="mb-4 flex items-center justify-between">
                        <div className="flex w-full items-center justify-between gap-4">
                            <h1 className="text-2xl font-bold tracking-tight">
                                {orderId ? "Edit Order" : "New Order"}
                            </h1>
                            <Button
                                size="sm"
                                className="lg:hidden"
                                onClick={() => setIsCartSheetOpen(true)}
                            >
                                <ShoppingCart className="h-4 w-4" />
                                Cart ({cart.length})
                            </Button>
                        </div>
                        {orderId && (
                            <div className="flex items-center gap-2">
                                <Badge
                                    variant={
                                        (orderData as { order?: OrderData })?.order?.status ===
                                        "COMPLETED"
                                            ? "secondary"
                                            : (orderData as { order?: OrderData })?.order
                                                    ?.status === "CANCELLED"
                                              ? "destructive"
                                              : "default"
                                    }
                                >
                                    {(orderData as { order?: OrderData })?.order?.status ===
                                        "COMPLETED" && <CheckCircle className="h-3 w-3" />}
                                    {(orderData as { order?: OrderData })?.order?.status ===
                                        "CANCELLED" && <XCircle className="h-3 w-3" />}
                                    {(orderData as { order?: OrderData })?.order?.status ===
                                        "PENDING" && <Clock className="h-3 w-3" />}
                                    {(orderData as { order?: OrderData })?.order?.status}
                                </Badge>
                            </div>
                        )}
                    </div>

                    <div className="mb-6 flex gap-4">
                        <div className="relative flex-1">
                            <Search className="text-muted-foreground absolute top-2.5 left-3 h-4 w-4" />
                            <Input
                                aria-label="Search menu items by name"
                                placeholder="Search menu items..."
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
                        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                            <SelectTrigger className="sm:w-[180px]">
                                <SelectValue placeholder="Filter by category" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Categories</SelectItem>
                                {categories.map((category: string) => (
                                    <SelectItem key={category} value={category}>
                                        {category}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Menu Items Grid */}
                    <div className="min-h-0 flex-1 overflow-y-auto">
                        <div className="mr-2">
                            {menuLoading ? (
                                <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-6 lg:grid-cols-[repeat(auto-fit,minmax(250px,1fr))]">
                                    {Array.from({ length: 8 }).map((_, i) => (
                                        <Card
                                            key={i}
                                            className="gap-0 overflow-hidden border-none py-0 shadow-sm xl:max-w-[350px]"
                                        >
                                            <Skeleton className="aspect-4/3 w-full rounded-t-lg" />
                                            <CardContent className="p-4">
                                                <Skeleton className="mb-2 h-6 w-3/4" />
                                                <Skeleton className="h-4 w-1/2" />
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            ) : (
                                <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-6 lg:grid-cols-[repeat(auto-fit,minmax(250px,1fr))]">
                                    {filteredMenuItems.map((item: MenuItem) => {
                                        const quantityInCart = getCartItemQuantity(item.id);
                                        return (
                                            <Card
                                                key={item.id}
                                                className={cn(
                                                    "group relative flex flex-col gap-0 overflow-hidden border-none py-0 shadow-sm transition-all hover:shadow-md xl:max-w-[300px]",
                                                    !item.isAvailable && "opacity-60",
                                                )}
                                            >
                                                <div className="relative aspect-video w-full overflow-hidden">
                                                    {item.imageUrl ? (
                                                        <Image
                                                            src={item.imageUrl}
                                                            alt={item.name}
                                                            fill
                                                            className="object-cover transition-transform duration-300 group-hover:scale-105"
                                                            onError={(e) => {
                                                                e.currentTarget.src =
                                                                    "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?q=80&w=2070&auto=format&fit=crop";
                                                            }}
                                                        />
                                                    ) : (
                                                        <div className="bg-muted flex h-full w-full items-center justify-center">
                                                            <Utensils className="text-muted-foreground/20 h-12 w-12" />
                                                        </div>
                                                    )}

                                                    <div className="absolute top-3 right-3">
                                                        {item.isAvailable ? (
                                                            <Badge className="bg-white/90 text-black backdrop-blur-sm hover:bg-white">
                                                                <span className="mr-1.5 h-2 w-2 rounded-full bg-green-500" />
                                                                Available
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="destructive">
                                                                <span className="mr-1.5 h-2 w-2 rounded-full bg-white" />
                                                                Unavailable
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>

                                                <CardContent className="flex flex-1 flex-col p-4">
                                                    <div className="mb-2 flex items-start justify-between gap-2">
                                                        <h3 className="line-clamp-1 font-semibold">
                                                            {item.name}
                                                        </h3>
                                                        <span className="font-semibold">
                                                            ${item.price.toFixed(2)}
                                                        </span>
                                                    </div>
                                                    {item.description && (
                                                        <p className="text-muted-foreground mb-4 line-clamp-1 text-sm">
                                                            {item.description}
                                                        </p>
                                                    )}

                                                    <div className="mt-auto">
                                                        {quantityInCart > 0 ? (
                                                            <Button
                                                                variant="outline"
                                                                className="border-primary/20 bg-primary/5 hover:bg-primary/10 w-full"
                                                                onClick={() => addToCart(item)}
                                                                disabled={!item.isAvailable}
                                                            >
                                                                <Plus className="h-4 w-4" />
                                                                Add More ({quantityInCart})
                                                            </Button>
                                                        ) : (
                                                            <Button
                                                                className="w-full"
                                                                onClick={() => addToCart(item)}
                                                                disabled={!item.isAvailable}
                                                                variant="secondary"
                                                            >
                                                                <Plus className="h-4 w-4" />
                                                                Add to Cart
                                                            </Button>
                                                        )}
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Load More Button */}
                        {hasMoreMenuItems && (
                            <div className="flex justify-center p-4">
                                <Button
                                    onClick={loadMoreMenuItems}
                                    disabled={loadingMore}
                                    variant="outline"
                                    size="lg"
                                >
                                    {loadingMore ? (
                                        <>
                                            <Spinner className="h-4 w-4" />
                                            Loading...
                                        </>
                                    ) : (
                                        <>
                                            Load More Items ({totalMenuItems - allMenuItems.length}{" "}
                                            remaining)
                                        </>
                                    )}
                                </Button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Order Summary */}
                <div className="hidden h-full min-h-0 flex-col lg:flex">
                    <div className="bg-background flex h-full flex-col overflow-hidden rounded-lg border shadow-sm">
                        {/* Cart Header */}
                        <div className="bg-muted/20 border-b p-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-semibold">Order Summary</h2>
                                <Badge variant="secondary" className="px-3 py-1">
                                    {cart.length} items
                                </Badge>
                            </div>
                        </div>

                        {/* Cart Items */}
                        <div className="flex-1 overflow-y-auto">
                            <div className="p-4">
                                {cart.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-center">
                                        <div className="bg-muted mb-4 flex h-16 w-16 items-center justify-center rounded-full">
                                            <ShoppingCart className="text-muted-foreground h-8 w-8" />
                                        </div>
                                        <h3 className="mb-1 text-lg font-medium">
                                            Your cart is empty
                                        </h3>
                                        <p className="text-muted-foreground max-w-[200px] text-sm">
                                            Select items from the menu to start your order
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {cart.map((item) => (
                                            <div
                                                key={item.menuItem.id}
                                                className="group hover:bg-accent/50 bg-card flex gap-4 rounded-lg border p-3 transition-colors"
                                            >
                                                <div className="relative size-14 shrink-0 overflow-hidden rounded-md border">
                                                    {item.menuItem.imageUrl ? (
                                                        <Image
                                                            src={item.menuItem.imageUrl}
                                                            alt={item.menuItem.name}
                                                            fill
                                                            className="object-cover"
                                                        />
                                                    ) : (
                                                        <div className="bg-muted flex h-full w-full items-center justify-center">
                                                            <Utensils className="text-muted-foreground/20 h-6 w-6" />
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex flex-1 flex-col justify-between">
                                                    <div className="flex justify-between gap-2">
                                                        <div>
                                                            <h4 className="line-clamp-1 font-medium">
                                                                {item.menuItem.name}
                                                            </h4>
                                                        </div>
                                                        <p className="font-semibold">
                                                            $
                                                            {(
                                                                item.menuItem.price * item.quantity
                                                            ).toFixed(2)}
                                                        </p>
                                                    </div>

                                                    <div className="mt-1 flex items-center justify-between">
                                                        <div className="flex items-center gap-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="text-muted-foreground hover:text-primary size-7 rounded-full transition-colors"
                                                                onClick={() =>
                                                                    updateQuantity(
                                                                        item.menuItem.id,
                                                                        item.quantity - 1,
                                                                    )
                                                                }
                                                            >
                                                                <Minus className="h-4 w-4" />
                                                            </Button>
                                                            <span className="w-4 text-center text-sm font-medium">
                                                                {item.quantity}
                                                            </span>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="text-muted-foreground hover:text-primary size-7 rounded-full transition-colors"
                                                                onClick={() =>
                                                                    updateQuantity(
                                                                        item.menuItem.id,
                                                                        item.quantity + 1,
                                                                    )
                                                                }
                                                            >
                                                                <Plus className="h-4 w-4" />
                                                            </Button>
                                                        </div>

                                                        <div className="flex items-center gap-2">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="text-muted-foreground hover:text-destructive h-7 w-7 rounded-full"
                                                                onClick={() =>
                                                                    removeFromCart(item.menuItem.id)
                                                                }
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer Section */}
                        <div className="bg-muted/20 space-y-3 border-t p-4">
                            {/* Totals */}
                            <div className="flex justify-between text-lg font-bold">
                                <span>Total</span>
                                <span>${getTotalAmount().toFixed(2)}</span>
                            </div>

                            {/* Actions */}
                            <div className="space-y-3">
                                {!orderId ? (
                                    <Button
                                        onClick={handleSubmit}
                                        disabled={cart.length === 0 || isSubmitting}
                                        className="w-full"
                                        size="lg"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <Spinner className="h-4 w-4" />
                                                Creating Order...
                                            </>
                                        ) : (
                                            <>
                                                <ShoppingCart className="h-4 w-4" />
                                                Create Order
                                            </>
                                        )}
                                    </Button>
                                ) : (
                                    <Button
                                        onClick={handleSubmit}
                                        disabled={cart.length === 0 || isSubmitting}
                                        variant="default"
                                        className="h-10 w-full"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <Spinner className="h-4 w-4" />
                                                Saving...
                                            </>
                                        ) : (
                                            <>
                                                <Save className="h-4 w-4" />
                                                Save Order
                                            </>
                                        )}
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <Sheet open={isCartSheetOpen} onOpenChange={setIsCartSheetOpen}>
                <SheetContent side="right" className="flex w-full flex-col gap-0">
                    <SheetHeader className="flex flex-row items-center justify-start border-b">
                        <SheetTitle>Order Summary</SheetTitle>
                        <Badge variant="secondary" className="px-2 py-0.5">
                            {cart.length} items
                        </Badge>
                    </SheetHeader>
                    <div className="flex-1 overflow-y-auto p-4">
                        {cart.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <div className="bg-muted mb-4 flex h-16 w-16 items-center justify-center rounded-full">
                                    <ShoppingCart className="text-muted-foreground h-8 w-8" />
                                </div>
                                <h3 className="mb-1 text-lg font-medium">Your cart is empty</h3>
                                <p className="text-muted-foreground max-w-[200px] text-sm">
                                    Select items from the menu to start your order
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {cart.map((item) => (
                                    <div
                                        key={item.menuItem.id}
                                        className="group hover:bg-accent/50 bg-card flex gap-4 rounded-lg border p-3 transition-colors"
                                    >
                                        <div className="relative size-14 shrink-0 overflow-hidden rounded-md border">
                                            {item.menuItem.imageUrl ? (
                                                <Image
                                                    src={item.menuItem.imageUrl}
                                                    alt={item.menuItem.name}
                                                    fill
                                                    className="object-cover"
                                                />
                                            ) : (
                                                <div className="bg-muted flex h-full w-full items-center justify-center">
                                                    <Utensils className="text-muted-foreground/20 h-6 w-6" />
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex flex-1 flex-col justify-between">
                                            <div className="flex justify-between gap-2">
                                                <div>
                                                    <h4 className="line-clamp-1 font-medium">
                                                        {item.menuItem.name}
                                                    </h4>
                                                </div>
                                                <p className="font-semibold">
                                                    $
                                                    {(item.menuItem.price * item.quantity).toFixed(
                                                        2,
                                                    )}
                                                </p>
                                            </div>

                                            <div className="mt-1 flex items-center justify-between">
                                                <div className="flex items-center gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-muted-foreground hover:text-primary size-7 rounded-full transition-colors"
                                                        onClick={() =>
                                                            updateQuantity(
                                                                item.menuItem.id,
                                                                item.quantity - 1,
                                                            )
                                                        }
                                                    >
                                                        <Minus className="h-4 w-4" />
                                                    </Button>
                                                    <span className="w-4 text-center text-sm font-medium">
                                                        {item.quantity}
                                                    </span>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-muted-foreground hover:text-primary size-7 rounded-full transition-colors"
                                                        onClick={() =>
                                                            updateQuantity(
                                                                item.menuItem.id,
                                                                item.quantity + 1,
                                                            )
                                                        }
                                                    >
                                                        <Plus className="h-4 w-4" />
                                                    </Button>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-muted-foreground hover:text-destructive h-7 w-7 rounded-full"
                                                        onClick={() =>
                                                            removeFromCart(item.menuItem.id)
                                                        }
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <SheetFooter className="bg-muted/20 space-y-3 border-t p-4">
                        {/* Totals */}
                        <div className="flex justify-between text-lg font-bold">
                            <span>Total</span>
                            <span>${getTotalAmount().toFixed(2)}</span>
                        </div>

                        {/* Actions */}
                        <div className="space-y-3">
                            {!orderId ? (
                                <Button
                                    onClick={handleSubmit}
                                    disabled={cart.length === 0 || isSubmitting}
                                    className="w-full"
                                    size="lg"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Spinner className="h-4 w-4" />
                                            Creating Order...
                                        </>
                                    ) : (
                                        <>
                                            <ShoppingCart className="h-4 w-4" />
                                            Create Order
                                        </>
                                    )}
                                </Button>
                            ) : (
                                <Button
                                    onClick={handleSubmit}
                                    disabled={cart.length === 0 || isSubmitting}
                                    variant="default"
                                    className="h-10 w-full"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Spinner className="h-4 w-4" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="h-4 w-4" />
                                            Save Order
                                        </>
                                    )}
                                </Button>
                            )}
                        </div>
                    </SheetFooter>
                </SheetContent>
            </Sheet>
        </>
    );
}
