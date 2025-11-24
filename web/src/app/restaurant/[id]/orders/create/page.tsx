"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useParams, useSearchParams, useRouter } from "next/navigation";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

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

const UPDATE_ORDER_STATUS = gql`
    mutation UpdateOrderStatus($id: ID!, $status: OrderStatus!) {
        updateOrderStatus(id: $id, status: $status) {
            id
            status
            updatedAt
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

    // Fetch menu items
    const { data: menuData, loading: menuLoading } = useQuery(GET_MENU_ITEMS, {
        variables: {
            restaurantId,
            first: 100, // Get all menu items for POS
            skip: 0,
        },
    });

    // Fetch menu categories
    const { data: categoriesData } = useQuery(GET_MENU_CATEGORIES, {
        variables: { restaurantId },
    });

    // Fetch existing order if editing
    const { data: orderData, loading: orderLoading } = useQuery(GET_ORDER, {
        variables: { id: orderId },
        skip: !orderId,
    });

    const [createOrder] = useMutation(CREATE_ORDER);
    const [updateOrderStatus] = useMutation(UPDATE_ORDER_STATUS);

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

    const menuItems =
        (menuData as { menuItems?: { menuItems: MenuItem[] } })?.menuItems?.menuItems || [];
    const categories = (categoriesData as { menuCategories?: string[] })?.menuCategories || [];

    const filteredMenuItems =
        selectedCategory === "all"
            ? menuItems.filter((item: MenuItem) =>
                  item.name.toLowerCase().includes(searchTerm.toLowerCase()),
              )
            : menuItems.filter(
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
                    notes: item.notes,
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

    const handleCompleteOrder = async () => {
        if (!orderId) return;

        try {
            await updateOrderStatus({
                variables: { id: orderId, status: "COMPLETED" },
            });
            toast.success("Order completed!");
            router.push(`/restaurant/${restaurantId}/orders`);
        } catch (error) {
            toast.error(extractErrorMessage(error));
        }
    };

    const handleCancelOrder = async () => {
        if (!orderId) return;

        try {
            await updateOrderStatus({
                variables: { id: orderId, status: "CANCELLED" },
            });
            toast.success("Order cancelled!");
            router.push(`/restaurant/${restaurantId}/orders`);
        } catch (error) {
            toast.error(extractErrorMessage(error));
        }
    };

    if (orderLoading && orderId) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Spinner className="h-8 w-8" />
            </div>
        );
    }

    return (
        <div className="grid h-full min-h-0 grid-cols-1 gap-6 lg:grid-cols-[1fr_400px]">
            {/* Left Column: Title, Search, and Menu Items */}
            <div className="flex min-h-0 flex-col">
                <div className="mb-4 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            {orderId ? "Edit Order" : "New Order"}
                        </h1>
                    </div>
                    {orderId && (
                        <div className="flex items-center gap-2">
                            <Badge
                                variant={
                                    (orderData as { order?: OrderData })?.order?.status ===
                                    "COMPLETED"
                                        ? "secondary"
                                        : (orderData as { order?: OrderData })?.order?.status ===
                                            "CANCELLED"
                                          ? "destructive"
                                          : "default"
                                }
                            >
                                {(orderData as { order?: OrderData })?.order?.status ===
                                    "COMPLETED" && <CheckCircle className="mr-1 h-3 w-3" />}
                                {(orderData as { order?: OrderData })?.order?.status ===
                                    "CANCELLED" && <XCircle className="mr-1 h-3 w-3" />}
                                {(orderData as { order?: OrderData })?.order?.status ===
                                    "PENDING" && <Clock className="mr-1 h-3 w-3" />}
                                {(orderData as { order?: OrderData })?.order?.status}
                            </Badge>
                        </div>
                    )}
                </div>

                <div className="mb-6 flex flex-col gap-4 sm:flex-row">
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
                        <SelectTrigger className="w-full sm:w-[200px]">
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
                <div className="min-h-0 flex-1">
                    <ScrollArea className="h-[calc(100vh-220px)]">
                        <div>
                            {menuLoading ? (
                                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                    {Array.from({ length: 8 }).map((_, i) => (
                                        <Card
                                            key={i}
                                            className="overflow-hidden border-none py-0 shadow-sm"
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
                                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                    {filteredMenuItems.map((item: MenuItem) => {
                                        const quantityInCart = getCartItemQuantity(item.id);
                                        return (
                                            <Card
                                                key={item.id}
                                                className={cn(
                                                    "group relative flex flex-col gap-0 overflow-hidden border-none py-0 shadow-sm transition-all hover:shadow-md",
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
                                                        <h3 className="line-clamp-2 font-semibold">
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

                                                    <div className="mt-auto pt-2">
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
                    </ScrollArea>
                </div>
            </div>

            {/* Right Column: Order Summary */}
            <div className="flex h-full min-h-0 flex-col">
                <div className="bg-card flex h-full flex-col rounded-xl border shadow-sm">
                    {/* Cart Header */}
                    <div className="border-b p-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold">Order Summary</h2>
                            <Badge variant="secondary" className="px-3 py-1">
                                {cart.length} items
                            </Badge>
                        </div>
                    </div>

                    {/* Cart Items */}
                    <ScrollArea className="h-[calc(100vh-400px)] flex-1">
                        <div className="p-4">
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
                                <div className="space-y-4">
                                    {cart.map((item) => (
                                        <div
                                            key={item.menuItem.id}
                                            className="group hover:bg-accent/50 flex gap-4 rounded-lg border p-3 transition-colors"
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

                                                <div className="mt-2 flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <button
                                                            className="text-muted-foreground hover:text-primary transition-colors"
                                                            onClick={() =>
                                                                updateQuantity(
                                                                    item.menuItem.id,
                                                                    item.quantity - 1,
                                                                )
                                                            }
                                                        >
                                                            <Minus className="h-4 w-4" />
                                                        </button>
                                                        <span className="w-4 text-center text-sm font-medium">
                                                            {item.quantity}
                                                        </span>
                                                        <button
                                                            className="text-muted-foreground hover:text-primary transition-colors"
                                                            onClick={() =>
                                                                updateQuantity(
                                                                    item.menuItem.id,
                                                                    item.quantity + 1,
                                                                )
                                                            }
                                                        >
                                                            <Plus className="h-4 w-4" />
                                                        </button>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-muted-foreground hover:text-destructive h-7 w-7"
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
                    </ScrollArea>

                    {/* Footer Section */}
                    <div className="bg-muted/20 space-y-3 border-t p-4">
                        {/* Totals */}
                        <div className="bg-muted space-y-2 rounded-lg p-4">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Subtotal</span>
                                <span>${getTotalAmount().toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Taxes (10%)</span>
                                <span>${(getTotalAmount() * 0.1).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between border-t pt-2 text-lg font-bold">
                                <span>Total</span>
                                <span>${(getTotalAmount() * 1.1).toFixed(2)}</span>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="space-y-3">
                            {!orderId ? (
                                <Button
                                    onClick={handleSubmit}
                                    disabled={cart.length === 0 || isSubmitting}
                                    className="h-12 w-full text-base"
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
                                <div className="grid grid-cols-2 gap-3">
                                    <Button
                                        onClick={handleSubmit}
                                        disabled={cart.length === 0 || isSubmitting}
                                        variant="default"
                                        className="h-10"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <Spinner className="h-4 w-4" />
                                                Saving...
                                            </>
                                        ) : (
                                            <>
                                                <Save className="h-4 w-4" />
                                                Save
                                            </>
                                        )}
                                    </Button>
                                    <Button
                                        onClick={handleCompleteOrder}
                                        disabled={
                                            (orderData as { order?: OrderData })?.order?.status ===
                                            "COMPLETED"
                                        }
                                        variant="secondary"
                                        className="h-10"
                                    >
                                        <CheckCircle className="h-4 w-4" />
                                        Complete
                                    </Button>
                                </div>
                            )}

                            {orderId &&
                                (orderData as { order?: OrderData })?.order?.status ===
                                    "PENDING" && (
                                    <Button
                                        onClick={handleCancelOrder}
                                        variant="ghost"
                                        className="text-destructive hover:text-destructive hover:bg-destructive/10 w-full"
                                    >
                                        Cancel Order
                                    </Button>
                                )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
