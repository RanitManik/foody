"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { gql } from "@apollo/client/core";
import { Plus, Search, MoreVertical, Trash2, X, Eye, CreditCard } from "lucide-react";
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
import {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from "@/components/ui/empty";
import { Alert, AlertDescription } from "@/components/ui/alert";
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

const GET_PAYMENT_METHODS = gql`
    query GetPaymentMethods {
        paymentMethods {
            id
            type
            provider
            last4
            createdAt
        }
    }
`;

const CREATE_PAYMENT_METHOD = gql`
    mutation CreatePaymentMethod($input: CreatePaymentMethodInput!) {
        createPaymentMethod(input: $input) {
            id
            type
            provider
            last4
            createdAt
        }
    }
`;

const DELETE_PAYMENT_METHOD = gql`
    mutation DeletePaymentMethod($id: ID!) {
        deletePaymentMethod(id: $id)
    }
`;

const paymentMethodSchema = z.object({
    type: z.string().min(1, "Payment type is required"),
    provider: z.string().min(1, "Payment provider is required"),
    token: z.string().min(1, "Payment token is required"),
});

type PaymentMethod = {
    id: string;
    type: string;
    provider: string;
    last4?: string;
    createdAt: string;
};

type PaymentMethodsData = {
    paymentMethods: PaymentMethod[];
};

const paymentTypeConfig = {
    CREDIT_CARD: { label: "Credit Card", icon: CreditCard },
    DEBIT_CARD: { label: "Debit Card", icon: CreditCard },
    PAYPAL: { label: "PayPal", icon: CreditCard },
    APPLE_PAY: { label: "Apple Pay", icon: CreditCard },
    GOOGLE_PAY: { label: "Google Pay", icon: CreditCard },
} as const;

const paymentProviderConfig = {
    STRIPE: { label: "Stripe" },
    PAYPAL: { label: "PayPal" },
    SQUARE: { label: "Square" },
    OTHER: { label: "Other" },
} as const;

export default function PaymentMethodsPage() {
    const [searchTerm, setSearchTerm] = useState("");
    const [providerFilter, setProviderFilter] = useState<string>("");
    const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false);
    const [deletingPaymentMethod, setDeletingPaymentMethod] = useState<PaymentMethod | null>(null);
    const [deleteConfirmName, setDeleteConfirmName] = useState("");
    const [deleteConfirmPhrase, setDeleteConfirmPhrase] = useState("");
    const [viewingPaymentMethod, setViewingPaymentMethod] = useState<PaymentMethod | null>(null);

    const { data, loading, error, refetch } = useQuery<PaymentMethodsData>(GET_PAYMENT_METHODS);

    useEffect(() => {
        if (error) {
            const msg = extractErrorMessage(error);
            toast.error(`Failed to load payment methods: ${msg}`);
        }
    }, [error]);

    const [createPaymentMethod, { loading: creating }] = useMutation(CREATE_PAYMENT_METHOD);
    const [deletePaymentMethod, { loading: deleting }] = useMutation(DELETE_PAYMENT_METHOD);

    const createForm = useForm<z.infer<typeof paymentMethodSchema>>({
        resolver: zodResolver(paymentMethodSchema),
        defaultValues: {
            type: "",
            provider: "",
            token: "",
        },
    });

    const filteredPaymentMethods =
        data?.paymentMethods
            ?.filter(
                (method: PaymentMethod) =>
                    method.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    method.provider.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    method.last4?.toLowerCase().includes(searchTerm.toLowerCase()),
            )
            .filter(
                (method: PaymentMethod) => !providerFilter || method.provider === providerFilter,
            ) || [];

    const handleCreate = async (values: z.infer<typeof paymentMethodSchema>) => {
        try {
            await createPaymentMethod({
                variables: {
                    input: {
                        type: values.type,
                        provider: values.provider,
                        token: values.token,
                    },
                },
            });
            toast.success("Payment method created successfully");
            setIsCreateSheetOpen(false);
            createForm.reset();
            refetch();
        } catch (error) {
            const msg = extractErrorMessage(error);
            toast.error(`Failed to create payment method: ${msg}`);
            console.error("Create payment method error:", error);
        }
    };

    const handleDelete = async () => {
        if (!deletingPaymentMethod) return;
        const CONFIRM_PHRASE = "delete my payment method";
        if (
            deleteConfirmName !== `${deletingPaymentMethod.type} ${deletingPaymentMethod.last4}` ||
            deleteConfirmPhrase !== CONFIRM_PHRASE
        ) {
            toast.error("Confirmation details do not match");
            return;
        }
        try {
            await deletePaymentMethod({
                variables: { id: deletingPaymentMethod.id },
            });
            toast.success("Payment method deleted successfully");
            setDeletingPaymentMethod(null);
            setDeleteConfirmName("");
            setDeleteConfirmPhrase("");
            refetch();
        } catch (error) {
            const msg = extractErrorMessage(error);
            toast.error(`Failed to delete payment method: ${msg}`);
            console.error("Delete payment method error:", error);
        }
    };

    if (error) {
        return (
            <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-semibold tracking-tight">Payment Methods</h1>
                </div>
                <div className="py-8 text-center">
                    <p className="text-destructive">Failed to load payment methods</p>
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
                <h1 className="text-2xl font-semibold tracking-tight">Payment Methods</h1>
                <Sheet open={isCreateSheetOpen} onOpenChange={setIsCreateSheetOpen}>
                    <SheetTrigger asChild>
                        <Button size="sm">
                            <Plus className="h-4 w-4" />
                            New Payment Method
                        </Button>
                    </SheetTrigger>
                    <SheetContent className="sm:max-w-[425px]">
                        <SheetHeader className="border-border border-b">
                            <SheetTitle>Create Payment Method</SheetTitle>
                            <SheetDescription>
                                Add a new payment method for processing payments.
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
                                    name="type"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>
                                                Payment Type{" "}
                                                <span className="text-destructive">*</span>
                                            </FormLabel>
                                            <FormControl>
                                                <Select
                                                    onValueChange={field.onChange}
                                                    value={field.value}
                                                >
                                                    <SelectTrigger className="w-full">
                                                        <SelectValue placeholder="Select payment type" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {Object.entries(paymentTypeConfig).map(
                                                            ([value, config]) => (
                                                                <SelectItem
                                                                    key={value}
                                                                    value={value}
                                                                >
                                                                    {config.label}
                                                                </SelectItem>
                                                            ),
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={createForm.control}
                                    name="provider"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>
                                                Payment Provider{" "}
                                                <span className="text-destructive">*</span>
                                            </FormLabel>
                                            <FormControl>
                                                <Select
                                                    onValueChange={field.onChange}
                                                    value={field.value}
                                                >
                                                    <SelectTrigger className="w-full">
                                                        <SelectValue placeholder="Select payment provider" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {Object.entries(paymentProviderConfig).map(
                                                            ([value, config]) => (
                                                                <SelectItem
                                                                    key={value}
                                                                    value={value}
                                                                >
                                                                    {config.label}
                                                                </SelectItem>
                                                            ),
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={createForm.control}
                                    name="token"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>
                                                Payment Token{" "}
                                                <span className="text-destructive">*</span>
                                            </FormLabel>
                                            <FormControl>
                                                <Input
                                                    {...field}
                                                    type="password"
                                                    placeholder="Enter payment token"
                                                />
                                            </FormControl>
                                            <FormDescription>
                                                This is a secure token provided by your payment
                                                processor.
                                            </FormDescription>
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
                                    "Create Payment Method"
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
                        aria-label="Search payment methods by type, provider, or last 4 digits"
                        placeholder="Search payment methods — type, provider, or last 4 digits"
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
                    value={providerFilter || "all"}
                    onValueChange={(value) => setProviderFilter(value === "all" ? "" : value)}
                >
                    <SelectTrigger className="sm:w-[180px]">
                        <SelectValue placeholder="Filter by provider" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Providers</SelectItem>
                        {Object.entries(paymentProviderConfig).map(([value, config]) => (
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
                    {!loading && data?.paymentMethods?.length === 0 ? (
                        <div className="p-6">
                            <Empty>
                                <EmptyHeader>
                                    <EmptyMedia variant="icon">
                                        <CreditCard />
                                    </EmptyMedia>
                                    <EmptyTitle>No payment methods yet</EmptyTitle>
                                    <EmptyDescription>
                                        {`You don't have any payment methods configured. Add a payment method to start accepting payments.`}
                                    </EmptyDescription>
                                </EmptyHeader>
                                <EmptyContent>
                                    <div className="flex gap-2">
                                        <Button onClick={() => setIsCreateSheetOpen(true)}>
                                            Create Payment Method
                                        </Button>
                                    </div>
                                </EmptyContent>
                            </Empty>
                        </div>
                    ) : !loading && filteredPaymentMethods.length === 0 && searchTerm ? (
                        <div className="p-6">
                            <Empty>
                                <EmptyHeader>
                                    <EmptyMedia variant="icon">
                                        <Search />
                                    </EmptyMedia>
                                    <EmptyTitle>No results</EmptyTitle>
                                    <EmptyDescription>
                                        No payment methods match{" "}
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
                            <TableHeader className="bg-card border-border sticky top-0 border-b">
                                <TableRow className="h-8">
                                    <TableHead className="bg-card sticky top-0 z-30 w-12 border-r px-1 text-center">
                                        #
                                    </TableHead>
                                    <TableHead className="bg-card sticky top-0 z-30 border-r px-2 sm:px-3 md:px-4">
                                        Type
                                    </TableHead>
                                    <TableHead className="bg-card sticky top-0 z-30 border-r px-2 sm:px-3 md:px-4">
                                        Provider
                                    </TableHead>
                                    <TableHead className="bg-card sticky top-0 z-30 border-r px-2 sm:px-3 md:px-4">
                                        Last 4 Digits
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
                                                  <Skeleton className="h-3 w-24" />
                                              </TableCell>
                                              <TableCell className="border-r px-2 sm:px-3 md:px-4">
                                                  <Skeleton className="h-3 w-16" />
                                              </TableCell>
                                              <TableCell className="border-r px-2 sm:px-3 md:px-4">
                                                  <Skeleton className="h-3 w-12" />
                                              </TableCell>
                                              <TableCell className="border-r px-2 text-center sm:px-3 md:px-4">
                                                  <Skeleton className="mx-auto h-3 w-20" />
                                              </TableCell>
                                              <TableCell className="px-1 text-center">
                                                  <Skeleton className="mx-auto h-6 w-6" />
                                              </TableCell>
                                          </TableRow>
                                      ))
                                    : filteredPaymentMethods.map(
                                          (method: PaymentMethod, idx: number) => {
                                              const typeInfo =
                                                  paymentTypeConfig[
                                                      method.type as keyof typeof paymentTypeConfig
                                                  ];
                                              const TypeIcon = typeInfo?.icon || CreditCard;
                                              return (
                                                  <TableRow
                                                      key={method.id}
                                                      className="hover:bg-muted/50 h-10 cursor-pointer"
                                                      onClick={() =>
                                                          setViewingPaymentMethod(method)
                                                      }
                                                  >
                                                      <TableCell className="border-r px-1 text-center">
                                                          <div className="text-muted-foreground text-xs">
                                                              {idx + 1}
                                                          </div>
                                                      </TableCell>
                                                      <TableCell className="border-r px-2 font-medium sm:px-3 md:px-4">
                                                          <div className="flex items-center gap-2">
                                                              <TypeIcon className="text-muted-foreground h-4 w-4" />
                                                              <span>
                                                                  {typeInfo?.label || method.type}
                                                              </span>
                                                          </div>
                                                      </TableCell>
                                                      <TableCell className="text-muted-foreground border-r px-2 sm:px-3 md:px-4">
                                                          <span>
                                                              {paymentProviderConfig[
                                                                  method.provider as keyof typeof paymentProviderConfig
                                                              ]?.label || method.provider}
                                                          </span>
                                                      </TableCell>
                                                      <TableCell className="text-muted-foreground border-r px-2 sm:px-3 md:px-4">
                                                          <span className="font-mono">
                                                              •••• {method.last4 || "****"}
                                                          </span>
                                                      </TableCell>
                                                      <TableCell className="text-muted-foreground border-r px-2 text-center text-xs sm:px-3 md:px-4">
                                                          {new Date(
                                                              method.createdAt,
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
                                                                          setViewingPaymentMethod(
                                                                              method,
                                                                          )
                                                                      }
                                                                  >
                                                                      <Eye className="h-4 w-4" />
                                                                      View Details
                                                                  </DropdownMenuItem>
                                                                  <DropdownMenuItem
                                                                      onClick={() =>
                                                                          setDeletingPaymentMethod(
                                                                              method,
                                                                          )
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
                                              );
                                          },
                                      )}
                            </TableBody>
                        </Table>
                    )}
                </div>
            </div>

            {/* View Details Sheet */}
            <Sheet open={!!viewingPaymentMethod} onOpenChange={() => setViewingPaymentMethod(null)}>
                <SheetContent>
                    <div className="flex h-full flex-col">
                        <SheetHeader className="border-b px-6 pb-4">
                            <SheetTitle className="flex items-center gap-2">
                                <CreditCard className="h-5 w-5" />
                                Payment Method Details
                            </SheetTitle>
                            <SheetDescription className="text-base">
                                {viewingPaymentMethod &&
                                    paymentTypeConfig[
                                        viewingPaymentMethod.type as keyof typeof paymentTypeConfig
                                    ]?.label}{" "}
                                • Created{" "}
                                {viewingPaymentMethod &&
                                    new Date(viewingPaymentMethod.createdAt).toLocaleString()}
                            </SheetDescription>
                        </SheetHeader>

                        <div className="flex-1 overflow-y-auto px-6 py-6">
                            {viewingPaymentMethod && (
                                <div className="space-y-6">
                                    {/* Basic Info */}
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <h4 className="text-muted-foreground text-sm font-semibold tracking-wide uppercase">
                                                    Type
                                                </h4>
                                                <div className="text-base font-medium">
                                                    {paymentTypeConfig[
                                                        viewingPaymentMethod.type as keyof typeof paymentTypeConfig
                                                    ]?.label || viewingPaymentMethod.type}
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <h4 className="text-muted-foreground text-sm font-semibold tracking-wide uppercase">
                                                    Provider
                                                </h4>
                                                <div className="text-base font-medium">
                                                    {paymentProviderConfig[
                                                        viewingPaymentMethod.provider as keyof typeof paymentProviderConfig
                                                    ]?.label || viewingPaymentMethod.provider}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <h4 className="text-muted-foreground text-sm font-semibold tracking-wide uppercase">
                                                    Last 4 Digits
                                                </h4>
                                                <div className="font-mono text-lg font-bold">
                                                    •••• {viewingPaymentMethod.last4 || "****"}
                                                </div>
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
            <Dialog
                open={!!deletingPaymentMethod}
                onOpenChange={() => setDeletingPaymentMethod(null)}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Payment Method</DialogTitle>
                        <DialogDescription>
                            This action cannot be undone. To confirm deletion, please enter the
                            payment method details below.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-6">
                        <div>
                            <Alert variant="destructive">
                                <AlertDescription>
                                    This will permanently delete the payment method and it cannot be
                                    used for future payments.
                                </AlertDescription>
                            </Alert>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="delete-name">
                                To confirm, type{" "}
                                <span className="font-semibold">
                                    &quot;{deletingPaymentMethod?.type}{" "}
                                    {deletingPaymentMethod?.last4}&quot;
                                </span>
                            </Label>
                            <Input
                                id="delete-name"
                                value={deleteConfirmName}
                                onChange={(e) => setDeleteConfirmName(e.target.value)}
                                placeholder={`Type ${deletingPaymentMethod?.type} ${deletingPaymentMethod?.last4}`}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="delete-phrase">
                                To confirm, type{" "}
                                <span className="font-semibold">
                                    &quot;delete my payment method&quot;
                                </span>
                            </Label>
                            <Input
                                id="delete-phrase"
                                value={deleteConfirmPhrase}
                                onChange={(e) => setDeleteConfirmPhrase(e.target.value)}
                                placeholder="Type delete my payment method"
                            />
                        </div>
                    </div>
                    <DialogFooter className="flex w-full sm:justify-between">
                        <Button
                            variant="outline"
                            onClick={() => setDeletingPaymentMethod(null)}
                            disabled={deleting}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={
                                deleting ||
                                deleteConfirmName !==
                                    `${deletingPaymentMethod?.type} ${deletingPaymentMethod?.last4}` ||
                                deleteConfirmPhrase !== "delete my payment method"
                            }
                        >
                            {deleting ? (
                                <span className="flex items-center">
                                    <Spinner className="mr-2" /> Deleting
                                </span>
                            ) : (
                                "Delete Payment Method"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
