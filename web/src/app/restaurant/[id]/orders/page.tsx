"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useQuery, useMutation } from "@apollo/client/react";
import { gql } from "@apollo/client/core";
import {
    Search,
    MoreVertical,
    Eye,
    X,
    Clock,
    CheckCircle,
    ChefHat,
    Truck,
    Package,
} from "lucide-react";
import { toast } from "sonner";
import extractErrorMessage from "@/lib/errors";
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

const GET_ORDERS = gql`
    query GetOrders($first: Int, $skip: Int) {
        orders(first: $first, skip: $skip) {
            orders {
                id
                status
                totalAmount

                phone
                specialInstructions
                user {
                    id
                    firstName
                    lastName
                    email
                }
                items {
                    id
                    quantity
                    price
                    notes
                    menuItem {
                        id
                        name
                        category
                        imageUrl
                    }
                }
                payment {
                    id
                    status
                }
                createdAt
                updatedAt
            }
            totalCount
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

const CANCEL_ORDER = gql`
    mutation CancelOrder($id: ID!) {
        cancelOrder(id: $id) {
            id
            status
            updatedAt
        }
    }
`;

type Order = {
    id: string;
    status: string;
    totalAmount: number;
    phone: string;
    specialInstructions?: string;
    user: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
    };
    items: Array<{
        id: string;
        quantity: number;
        price: number;
        notes?: string;
        menuItem: {
            id: string;
            name: string;
            category?: string;
            imageUrl?: string;
        };
    }>;
    payment?: {
        id: string;
        status: string;
    };
    createdAt: string;
    updatedAt: string;
};

type OrdersData = {
    orders: {
        orders: Order[];
        totalCount: number;
    };
};

const statusConfig = {
    PENDING: { label: "Pending", color: "secondary", icon: Clock },
    CONFIRMED: { label: "Confirmed", color: "default", icon: CheckCircle },
    PREPARING: { label: "Preparing", color: "outline", icon: ChefHat },
    READY: { label: "Ready", color: "secondary", icon: Package },
    DELIVERED: { label: "Delivered", color: "default", icon: Truck },
    CANCELLED: { label: "Cancelled", color: "destructive", icon: X },
} as const;

export default function OrdersPage() {
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("");
    const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
    const [cancellingOrder, setCancellingOrder] = useState<Order | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 20;

    const { data, loading, error, refetch } = useQuery<OrdersData>(GET_ORDERS, {
        variables: {
            first: pageSize,
            skip: (currentPage - 1) * pageSize,
        },
        fetchPolicy: "cache-first", // Use cache when available
    });

    const totalCount = data?.orders?.totalCount ?? 0;
    const totalPages = Math.ceil(totalCount / pageSize);
    const hasNextPage = currentPage < totalPages;

    useEffect(() => {
        if (error) {
            const msg = extractErrorMessage(error);
            toast.error(`Failed to load orders: ${msg}`);
        }
    }, [error]);

    const [updateOrderStatus] = useMutation(UPDATE_ORDER_STATUS);
    const [cancelOrder, { loading: cancelling }] = useMutation(CANCEL_ORDER);

    const filteredOrders =
        data?.orders?.orders?.filter((order: Order) => {
            const matchesSearch =
                order.user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                order.user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                order.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                order.items.some((item) =>
                    item.menuItem?.name.toLowerCase().includes(searchTerm.toLowerCase()),
                );

            const matchesStatus = !statusFilter || order.status === statusFilter;

            return matchesSearch && matchesStatus;
        }) || [];

    const handleConfirmOrder = async (orderId: string) => {
        toast.promise(
            updateOrderStatus({
                variables: { id: orderId, status: "CONFIRMED" },
            }).then(() => {
                refetch();
            }),
            {
                loading: "Confirming order...",
                success: "Order confirmed successfully",
                error: (error) => {
                    const msg = extractErrorMessage(error);
                    return `Failed to confirm order: ${msg}`;
                },
            },
        );
    };

    const handleCancelOrder = async () => {
        if (!cancellingOrder) return;
        try {
            await cancelOrder({
                variables: { id: cancellingOrder.id },
            });
            toast.success("Order cancelled successfully");
            setCancellingOrder(null);
            refetch();
        } catch (error) {
            const msg = extractErrorMessage(error);
            toast.error(`Failed to cancel order: ${msg}`);
            console.error("Cancel order error:", error);
        }
    };

    const handleRowClick = (order: Order) => {
        setViewingOrder(order);
    };

    if (error) {
        return (
            <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
                </div>
                <div className="py-8 text-center">
                    <p className="text-destructive">Failed to load orders</p>
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
                <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
            </div>

            <div className="flex gap-4">
                <div className="relative flex-1">
                    <Search className="text-muted-foreground absolute top-2.5 left-3 h-4 w-4" />
                    <Input
                        aria-label="Search orders by customer name, email, order ID, or menu items"
                        placeholder="Search orders — customer, email, order ID, or items"
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
                    value={statusFilter || "all"}
                    onValueChange={(value) => setStatusFilter(value === "all" ? "" : value)}
                >
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        {Object.entries(statusConfig).map(([value, config]) => (
                            <SelectItem key={value} value={value}>
                                {config.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="min-h-0 overflow-hidden border">
                <div className="h-full min-h-0 overflow-auto">
                    {/* Empty states */}
                    {!loading && data?.orders?.orders?.length === 0 ? (
                        <div className="p-6">
                            <Empty>
                                <EmptyHeader>
                                    <EmptyMedia variant="icon">
                                        <Package />
                                    </EmptyMedia>
                                    <EmptyTitle>No orders yet</EmptyTitle>
                                    <EmptyDescription>
                                        {`You don't have any orders yet. Orders from customers will appear here.`}
                                    </EmptyDescription>
                                </EmptyHeader>
                            </Empty>
                        </div>
                    ) : !loading && filteredOrders.length === 0 && (searchTerm || statusFilter) ? (
                        <div className="p-6">
                            <Empty>
                                <EmptyHeader>
                                    <EmptyMedia variant="icon">
                                        <Search />
                                    </EmptyMedia>
                                    <EmptyTitle>No results</EmptyTitle>
                                    <EmptyDescription>
                                        No orders match your current filters. Try adjusting your
                                        search or filter criteria.
                                    </EmptyDescription>
                                </EmptyHeader>
                                <EmptyContent>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                setSearchTerm("");
                                                setStatusFilter("");
                                            }}
                                        >
                                            Clear Filters
                                        </Button>
                                    </div>
                                </EmptyContent>
                            </Empty>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader className="bg-card border-border sticky top-0 border-b">
                                <TableRow className="h-8">
                                    <TableHead className="bg-card sticky top-0 z-30 w-12 border-r px-1 text-center">
                                        #
                                    </TableHead>
                                    <TableHead className="bg-card sticky top-0 z-30 border-r px-2 sm:px-3 md:px-4">
                                        Order ID
                                    </TableHead>
                                    <TableHead className="bg-card sticky top-0 z-30 border-r px-2 sm:px-3 md:px-4">
                                        Customer
                                    </TableHead>
                                    <TableHead className="bg-card sticky top-0 z-30 border-r px-2 sm:px-3 md:px-4">
                                        Items
                                    </TableHead>
                                    <TableHead className="bg-card sticky top-0 z-30 border-r px-2 sm:px-3 md:px-4">
                                        Total
                                    </TableHead>
                                    <TableHead className="bg-card sticky top-0 z-30 border-r px-2 text-center sm:px-3 md:px-4">
                                        Status
                                    </TableHead>
                                    <TableHead className="bg-card sticky top-0 z-30 border-r px-2 text-center sm:px-3 md:px-4">
                                        Created
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
                                                  <Skeleton className="h-3 w-16" />
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
                                    : filteredOrders.map((order: Order, idx: number) => {
                                          const statusInfo =
                                              statusConfig[
                                                  order.status as keyof typeof statusConfig
                                              ];
                                          const StatusIcon = statusInfo.icon;
                                          return (
                                              <TableRow
                                                  key={order.id}
                                                  className="hover:bg-muted/50 h-10 cursor-pointer"
                                                  onClick={() => handleRowClick(order)}
                                              >
                                                  <TableCell className="border-r px-1 text-center">
                                                      <div className="text-muted-foreground text-xs">
                                                          {(currentPage - 1) * pageSize + idx + 1}
                                                      </div>
                                                  </TableCell>
                                                  <TableCell className="border-r px-2 font-mono text-xs font-medium sm:px-3 md:px-4">
                                                      {order.id.slice(-8)}
                                                  </TableCell>
                                                  <TableCell className="border-r px-2 sm:px-3 md:px-4">
                                                      <div
                                                          className="max-w-40 truncate text-xs md:max-w-none md:overflow-visible md:text-sm"
                                                          title={`${order.user.firstName} ${order.user.lastName} (${order.user.email})`}
                                                      >
                                                          {order.user.firstName}{" "}
                                                          {order.user.lastName} • {order.user.email}
                                                      </div>
                                                  </TableCell>
                                                  <TableCell className="border-r px-2 sm:px-3 md:px-4">
                                                      <div
                                                          className="max-w-40 truncate text-xs md:max-w-none md:overflow-visible md:text-sm"
                                                          title={`${order.items.length} item${order.items.length !== 1 ? "s" : ""}: ${order.items[0]?.menuItem?.name || "Unknown"}${order.items.length > 1 ? ` +${order.items.length - 1} more` : ""}`}
                                                      >
                                                          {order.items.length} item
                                                          {order.items.length !== 1
                                                              ? "s"
                                                              : ""} •{" "}
                                                          {order.items[0]?.menuItem?.name ||
                                                              "Unknown"}
                                                          {order.items.length > 1 &&
                                                              ` +${order.items.length - 1}`}
                                                      </div>
                                                  </TableCell>
                                                  <TableCell className="border-r px-2 text-sm font-medium sm:px-3 md:px-4">
                                                      ${order.totalAmount.toFixed(2)}
                                                  </TableCell>
                                                  <TableCell className="border-r px-2 text-center sm:px-3 md:px-4">
                                                      <Badge
                                                          variant={
                                                              statusInfo.color as
                                                                  | "secondary"
                                                                  | "default"
                                                                  | "outline"
                                                                  | "destructive"
                                                          }
                                                          className="h-5 px-1.5 py-0.5 text-xs"
                                                      >
                                                          <StatusIcon className="mr-1 h-2.5 w-2.5" />
                                                          {statusInfo.label}
                                                      </Badge>
                                                  </TableCell>
                                                  <TableCell className="text-muted-foreground border-r px-2 text-center text-xs sm:px-3 md:px-4">
                                                      {new Date(
                                                          order.createdAt,
                                                      ).toLocaleDateString()}
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
                                                                      setViewingOrder(order)
                                                                  }
                                                              >
                                                                  <Eye className="mr-2 h-4 w-4" />
                                                                  View Details
                                                              </DropdownMenuItem>
                                                              {order.status === "PENDING" && (
                                                                  <DropdownMenuItem
                                                                      onClick={() =>
                                                                          handleConfirmOrder(
                                                                              order.id,
                                                                          )
                                                                      }
                                                                  >
                                                                      <CheckCircle className="mr-2 h-4 w-4" />
                                                                      Confirm Order
                                                                  </DropdownMenuItem>
                                                              )}
                                                              {order.status !== "DELIVERED" &&
                                                                  order.status !== "CANCELLED" && (
                                                                      <DropdownMenuItem
                                                                          onClick={() =>
                                                                              setCancellingOrder(
                                                                                  order,
                                                                              )
                                                                          }
                                                                          className="text-destructive"
                                                                      >
                                                                          <X className="mr-2 h-4 w-4" />
                                                                          Cancel Order
                                                                      </DropdownMenuItem>
                                                                  )}
                                                          </DropdownMenuContent>
                                                      </DropdownMenu>
                                                  </TableCell>
                                              </TableRow>
                                          );
                                      })}
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
                            Page {currentPage} of {totalPages} • {totalCount} total orders
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

            {/* Order Details Sheet */}
            <Sheet open={!!viewingOrder} onOpenChange={() => setViewingOrder(null)}>
                <SheetContent>
                    <div className="flex h-full flex-col">
                        <SheetHeader className="border-b px-6 pb-4">
                            <SheetTitle className="flex items-center gap-2">
                                <Package className="h-5 w-5" />
                                Order Details
                            </SheetTitle>
                            <SheetDescription className="text-base">
                                Order #{viewingOrder?.id.slice(-8)} •{" "}
                                {viewingOrder && new Date(viewingOrder.createdAt).toLocaleString()}
                            </SheetDescription>
                        </SheetHeader>

                        <div className="flex-1 overflow-y-auto px-6 py-6">
                            {viewingOrder && (
                                <div className="space-y-6">
                                    {/* Order Status and Customer Info */}
                                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <h4 className="text-muted-foreground text-sm font-semibold tracking-wide uppercase">
                                                Customer
                                            </h4>
                                            <div className="space-y-2">
                                                <div className="font-medium">
                                                    {viewingOrder.user.firstName}{" "}
                                                    {viewingOrder.user.lastName}
                                                </div>
                                                <div className="text-muted-foreground text-sm">
                                                    {viewingOrder.user.email}
                                                </div>
                                                <div className="text-muted-foreground text-sm">
                                                    {viewingOrder.phone}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <h4 className="text-muted-foreground text-sm font-semibold tracking-wide uppercase">
                                                Status
                                            </h4>
                                            <Badge
                                                variant={
                                                    statusConfig[
                                                        viewingOrder.status as keyof typeof statusConfig
                                                    ].color as
                                                        | "secondary"
                                                        | "default"
                                                        | "outline"
                                                        | "destructive"
                                                }
                                                className="w-fit"
                                            >
                                                {
                                                    statusConfig[
                                                        viewingOrder.status as keyof typeof statusConfig
                                                    ].label
                                                }
                                            </Badge>
                                        </div>
                                    </div>

                                    {/* Special Instructions */}
                                    {viewingOrder.specialInstructions && (
                                        <div className="space-y-2">
                                            <h4 className="text-muted-foreground text-sm font-semibold tracking-wide uppercase">
                                                Special Instructions
                                            </h4>
                                            <div className="bg-muted/50 rounded-md p-3 text-sm italic">
                                                {viewingOrder.specialInstructions}
                                            </div>
                                        </div>
                                    )}

                                    {/* Order Items */}
                                    <div className="space-y-4">
                                        <h4 className="text-muted-foreground text-sm font-semibold tracking-wide uppercase">
                                            Order Items
                                        </h4>
                                        <div className="space-y-2">
                                            {viewingOrder.items.map((item) => (
                                                <div
                                                    key={item.id}
                                                    className="bg-card flex items-start gap-4 rounded-lg border p-4"
                                                >
                                                    <div className="shrink-0">
                                                        <Image
                                                            src={
                                                                item.menuItem?.imageUrl ||
                                                                "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?q=80&w=2070&auto=format&fit=crop"
                                                            }
                                                            alt={item.menuItem?.name || "Menu item"}
                                                            width={64}
                                                            height={64}
                                                            className="h-16 w-16 rounded-md object-cover"
                                                            onError={(e) => {
                                                                e.currentTarget.src =
                                                                    "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?q=80&w=2070&auto=format&fit=crop";
                                                            }}
                                                        />
                                                    </div>
                                                    <div className="flex-1 space-y-1">
                                                        <div className="font-medium">
                                                            {item.menuItem?.name || "Unknown item"}
                                                        </div>
                                                        {item.menuItem?.category && (
                                                            <div className="text-muted-foreground text-sm">
                                                                {item.menuItem?.category}
                                                            </div>
                                                        )}
                                                        {item.notes && (
                                                            <div className="text-muted-foreground bg-muted/30 rounded px-2 py-1 text-sm italic">
                                                                Note: {item.notes}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="space-y-1 text-right">
                                                        <div className="font-medium">
                                                            ${item.price.toFixed(2)} ×{" "}
                                                            {item.quantity}
                                                        </div>
                                                        <div className="text-muted-foreground text-sm">
                                                            $
                                                            {(item.price * item.quantity).toFixed(
                                                                2,
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="bg-muted/20 flex items-center justify-between rounded-lg border-t-2 p-4 pt-4">
                                            <span className="text-base font-semibold">Total</span>
                                            <span className="text-base font-bold">
                                                ${viewingOrder.totalAmount.toFixed(2)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Payment Info */}
                                    {viewingOrder.payment && (
                                        <div className="space-y-2">
                                            <h4 className="text-muted-foreground text-sm font-semibold tracking-wide uppercase">
                                                Payment
                                            </h4>
                                            <div className="bg-muted/50 flex items-center gap-3 rounded-md p-3">
                                                <Badge
                                                    variant={
                                                        viewingOrder.payment.status === "COMPLETED"
                                                            ? "default"
                                                            : "secondary"
                                                    }
                                                >
                                                    {viewingOrder.payment.status}
                                                </Badge>
                                            </div>
                                        </div>
                                    )}
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

            {/* Cancel Order Dialog */}
            <Dialog open={!!cancellingOrder} onOpenChange={() => setCancellingOrder(null)}>
                <DialogContent>
                    <DialogHeader className="pb-2">
                        <DialogTitle>Cancel Order</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to cancel order #{cancellingOrder?.id.slice(-8)}?
                            This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <Alert variant="destructive">
                            <AlertDescription>
                                Cancelling this order will notify the customer and mark it as
                                cancelled. The customer may need to place a new order.
                            </AlertDescription>
                        </Alert>
                    </div>
                    <DialogFooter className="flex w-full sm:justify-between">
                        <Button
                            variant="outline"
                            onClick={() => setCancellingOrder(null)}
                            disabled={cancelling}
                        >
                            Keep Order
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleCancelOrder}
                            disabled={cancelling}
                        >
                            {cancelling ? (
                                <span className="flex items-center">
                                    <Spinner className="mr-2" /> Cancelling
                                </span>
                            ) : (
                                "Cancel Order"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
