"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { gql } from "@apollo/client/core";
import {
    Search,
    MoreVertical,
    Eye,
    EyeOff,
    Users,
    UserCheck,
    UserX,
    Edit,
    Trash2,
    Shield,
    Building,
    Mail,
    X,
    Plus,
    User,
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
    SheetTrigger,
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
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/lib/auth-context";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription,
} from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";

const GET_USERS = gql`
    query GetUsers($first: Int, $skip: Int) {
        users(first: $first, skip: $skip) {
            users {
                id
                email
                firstName
                lastName
                role
                restaurantId
                restaurant {
                    id
                    name
                }
                isActive
                createdAt
                updatedAt
            }
            totalCount
        }
    }
`;

const UPDATE_USER = gql`
    mutation UpdateUser($id: ID!, $input: UpdateUserInput!) {
        updateUser(id: $id, input: $input) {
            id
            email
            firstName
            lastName
            role
            restaurantId
            isActive
            updatedAt
        }
    }
`;

const DELETE_USER = gql`
    mutation DeleteUser($id: ID!) {
        deleteUser(id: $id)
    }
`;

const CREATE_USER = gql`
    mutation CreateUser($input: CreateUserInput!) {
        createUser(input: $input) {
            id
            email
            firstName
            lastName
            role
            restaurantId
            isActive
            createdAt
        }
    }
`;

type User = {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    restaurantId?: string;
    restaurant?: {
        id: string;
        name: string;
    };
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
};

type UsersData = {
    users: {
        users: User[];
        totalCount: number;
    };
};

type UserUpdates = {
    firstName?: string;
    lastName?: string;
    email?: string;
    password?: string;
    role?: string;
    restaurantId?: string | null;
    isActive?: boolean;
};

const roleConfig = {
    ADMIN: { label: "Admin", color: "destructive", icon: Shield },
    MANAGER: { label: "Manager", color: "default", icon: Building },
    MEMBER: { label: "Member", color: "secondary", icon: Users },
} as const;

const userSchema = z.object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().email("Invalid email address"),
    password: z
        .string()
        .min(8, "Password must be at least 8 characters long")
        .optional()
        .or(z.literal("")),
    role: z.enum(["ADMIN", "MANAGER", "MEMBER"]),
    restaurantId: z.string().optional(),
    isActive: z.boolean().optional(),
});

const createUserSchema = z.object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters long"),
    role: z.enum(["ADMIN", "MANAGER", "MEMBER"]),
    restaurantId: z.string().optional(),
    isActive: z.boolean().optional(),
});

type UserFormData = z.infer<typeof userSchema>;

type CreateUserFormData = z.infer<typeof createUserSchema>;

export default function UsersPage() {
    const { user } = useAuth();
    const [searchTerm, setSearchTerm] = useState("");
    const [roleFilter, setRoleFilter] = useState<string>("");
    const [viewingUser, setViewingUser] = useState<User | null>(null);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [deletingUser, setDeletingUser] = useState<User | null>(null);
    const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false);
    const [deleteConfirmName, setDeleteConfirmName] = useState("");
    const [deleteConfirmPhrase, setDeleteConfirmPhrase] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 20;

    const { data, loading, error, refetch } = useQuery<UsersData>(GET_USERS, {
        variables: {
            first: pageSize,
            skip: (currentPage - 1) * pageSize,
        },
        fetchPolicy: "cache-first",
    });

    const { data: restaurantsData } = useQuery<RestaurantsData>(GET_RESTAURANTS);
    const availableRestaurants = restaurantsData?.restaurants?.restaurants || [];

    const totalCount = data?.users?.totalCount ?? 0;
    const totalPages = Math.ceil(totalCount / pageSize);
    const hasNextPage = currentPage < totalPages;

    useEffect(() => {
        if (error) {
            const msg = extractErrorMessage(error);
            toast.error(`Failed to load users: ${msg}`);
        }
    }, [error]);

    const [updateUser, { loading: updating }] = useMutation(UPDATE_USER);
    const [deleteUser, { loading: deleting }] = useMutation(DELETE_USER);
    const [createUser, { loading: creating }] = useMutation(CREATE_USER);

    const createForm = useForm<CreateUserFormData>({
        resolver: zodResolver(createUserSchema),
        defaultValues: {
            firstName: "",
            lastName: "",
            email: "",
            password: "",
            role: "MEMBER",
            restaurantId: "",
            isActive: true,
        },
    });

    // Check if user is admin
    if (!user || user.role !== "ADMIN") {
        return (
            <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
                </div>
                <div className="py-8 text-center">
                    <p className="text-destructive">Access denied. Admin privileges required.</p>
                </div>
            </div>
        );
    }

    const filteredUsers =
        data?.users?.users?.filter((user: User) => {
            const matchesSearch =
                user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.id.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesRole = !roleFilter || user.role === roleFilter;

            return matchesSearch && matchesRole;
        }) || [];

    const handleUpdateUser = async (userId: string, updates: UserUpdates) => {
        try {
            await updateUser({
                variables: { id: userId, input: updates },
            });
            toast.success("User updated successfully");
            setEditingUser(null);
            refetch();
        } catch (error) {
            const msg = extractErrorMessage(error);
            toast.error(`Failed to update user: ${msg}`);
        }
    };

    const handleDeleteUser = async () => {
        if (!deletingUser) return;
        const CONFIRM_PHRASE = "delete my user";
        if (
            deleteConfirmName !== deletingUser.firstName + " " + deletingUser.lastName ||
            deleteConfirmPhrase !== CONFIRM_PHRASE
        ) {
            toast.error("Confirmation details do not match");
            return;
        }
        try {
            await deleteUser({
                variables: { id: deletingUser.id },
            });
            toast.success("User deleted successfully");
            setDeletingUser(null);
            setDeleteConfirmName("");
            setDeleteConfirmPhrase("");
            refetch();
        } catch (error) {
            const msg = extractErrorMessage(error);
            toast.error(`Failed to delete user: ${msg}`);
        }
    };

    const handleCreateUser = async (values: CreateUserFormData) => {
        try {
            await createUser({
                variables: {
                    input: {
                        firstName: values.firstName,
                        lastName: values.lastName,
                        email: values.email,
                        password: values.password,
                        role: values.role,
                        restaurantId:
                            values.restaurantId === "none" ? null : values.restaurantId || null,
                        isActive: values.isActive,
                    },
                },
            });
            toast.success("User created successfully");
            setIsCreateSheetOpen(false);
            createForm.reset();
            refetch();
        } catch (error) {
            const msg = extractErrorMessage(error);
            toast.error(`Failed to create user: ${msg}`);
        }
    };

    const handleRowClick = (user: User) => {
        setViewingUser(user);
    };

    if (error) {
        return (
            <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
                </div>
                <div className="py-8 text-center">
                    <p className="text-destructive">Failed to load users</p>
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
                <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
                <Sheet open={isCreateSheetOpen} onOpenChange={setIsCreateSheetOpen}>
                    <SheetTrigger asChild>
                        <Button size="sm">
                            <Plus className="h-4 w-4" />
                            Add User
                        </Button>
                    </SheetTrigger>
                    <SheetContent>
                        <SheetHeader className="border-border border-b">
                            <SheetTitle>Create User</SheetTitle>
                            <SheetDescription>Add a new user to the system.</SheetDescription>
                        </SheetHeader>
                        <Form {...createForm}>
                            <form
                                id="create-user-form"
                                onSubmit={createForm.handleSubmit(handleCreateUser)}
                                className="space-y-4 p-4"
                            >
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <FormField
                                        control={createForm.control}
                                        name="firstName"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>
                                                    First Name{" "}
                                                    <span className="text-destructive">*</span>
                                                </FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder="Enter first name"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={createForm.control}
                                        name="lastName"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>
                                                    Last Name{" "}
                                                    <span className="text-destructive">*</span>
                                                </FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder="Enter last name"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <FormField
                                    control={createForm.control}
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>
                                                Email <span className="text-destructive">*</span>
                                            </FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="email"
                                                    placeholder="Enter email address"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={createForm.control}
                                    name="password"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>
                                                Password <span className="text-destructive">*</span>
                                            </FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Input
                                                        type={showPassword ? "text" : "password"}
                                                        placeholder="Enter password"
                                                        className="pr-10"
                                                        {...field}
                                                    />
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="absolute top-0 right-0 h-full hover:bg-transparent!"
                                                        onClick={() =>
                                                            setShowPassword(!showPassword)
                                                        }
                                                        aria-label={
                                                            showPassword
                                                                ? "Hide password"
                                                                : "Show password"
                                                        }
                                                    >
                                                        {showPassword ? (
                                                            <EyeOff className="h-4 w-4" />
                                                        ) : (
                                                            <Eye className="h-4 w-4" />
                                                        )}
                                                    </Button>
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={createForm.control}
                                    name="role"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>
                                                Role <span className="text-destructive">*</span>
                                            </FormLabel>
                                            <FormControl>
                                                <Select
                                                    value={field.value}
                                                    onValueChange={field.onChange}
                                                >
                                                    <SelectTrigger className="w-full">
                                                        <SelectValue placeholder="Select a role" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="ADMIN">Admin</SelectItem>
                                                        <SelectItem value="MANAGER">
                                                            Manager
                                                        </SelectItem>
                                                        <SelectItem value="MEMBER">
                                                            Member
                                                        </SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={createForm.control}
                                    name="restaurantId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Restaurant</FormLabel>
                                            <FormControl>
                                                <Select
                                                    value={field.value || "none"}
                                                    onValueChange={field.onChange}
                                                >
                                                    <SelectTrigger className="w-full">
                                                        <SelectValue placeholder="Select restaurant" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="none">
                                                            No restaurant
                                                        </SelectItem>
                                                        {availableRestaurants.map((restaurant) => (
                                                            <SelectItem
                                                                key={restaurant.id}
                                                                value={restaurant.id}
                                                            >
                                                                {restaurant.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
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
                                                    Whether the user can log in and access
                                                </FormDescription>
                                            </div>
                                            <FormControl>
                                                <Switch
                                                    checked={!!field.value}
                                                    onCheckedChange={(checked) =>
                                                        field.onChange(checked)
                                                    }
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </form>
                        </Form>
                        <SheetFooter className="border-border border-t">
                            <Button type="submit" form="create-user-form" disabled={creating}>
                                {creating ? (
                                    <span className="flex items-center">
                                        <Spinner className="mr-2" /> Creating
                                    </span>
                                ) : (
                                    "Create User"
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
                        aria-label="Search users by name, email, or user ID"
                        placeholder="Search users — name, email, or ID"
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
                    value={roleFilter || "all"}
                    onValueChange={(value) => setRoleFilter(value === "all" ? "" : value)}
                >
                    <SelectTrigger className="sm:min-w-[180px]">
                        <SelectValue placeholder="Filter by role" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Roles</SelectItem>
                        {Object.entries(roleConfig).map(([value, config]) => (
                            <SelectItem key={value} value={value}>
                                {config.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="min-h-0 overflow-hidden border">
                <div className="h-full min-h-0 overflow-auto">
                    {!loading && data?.users?.users?.length === 0 ? (
                        <div className="p-6">
                            <Empty>
                                <EmptyHeader>
                                    <EmptyMedia variant="icon">
                                        <Users />
                                    </EmptyMedia>
                                    <EmptyTitle>No users found</EmptyTitle>
                                    <EmptyDescription>
                                        No users are registered in the system yet.
                                    </EmptyDescription>
                                </EmptyHeader>
                            </Empty>
                        </div>
                    ) : !loading && filteredUsers.length === 0 && (searchTerm || roleFilter) ? (
                        <div className="p-6">
                            <Empty>
                                <EmptyHeader>
                                    <EmptyMedia variant="icon">
                                        <Search />
                                    </EmptyMedia>
                                    <EmptyTitle>No results</EmptyTitle>
                                    <EmptyDescription>
                                        No users match your current filters. Try adjusting your
                                        search or filter criteria.
                                    </EmptyDescription>
                                </EmptyHeader>
                                <EmptyContent>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                setSearchTerm("");
                                                setRoleFilter("");
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
                            <TableHeader className="bg-foreground border-border sticky top-0 border-b">
                                <TableRow className="h-8">
                                    <TableHead className="bg-card sticky top-0 z-30 w-12 border-r px-1 text-center">
                                        #
                                    </TableHead>
                                    <TableHead className="bg-card sticky top-0 z-30 border-r px-2 sm:px-3 md:px-4">
                                        User ID
                                    </TableHead>
                                    <TableHead className="bg-card sticky top-0 z-30 border-r px-2 sm:px-3 md:px-4">
                                        Name
                                    </TableHead>
                                    <TableHead className="bg-card sticky top-0 z-30 border-r px-2 sm:px-3 md:px-4">
                                        Email
                                    </TableHead>
                                    <TableHead className="bg-card sticky top-0 z-30 border-r px-2 sm:px-3 md:px-4">
                                        Role
                                    </TableHead>
                                    <TableHead className="bg-card sticky top-0 z-30 border-r px-2 sm:px-3 md:px-4">
                                        Restaurant
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
                                                  <Skeleton className="h-3 w-24" />
                                              </TableCell>
                                              <TableCell className="border-r px-2 sm:px-3 md:px-4">
                                                  <Skeleton className="h-3 w-32" />
                                              </TableCell>
                                              <TableCell className="border-r px-2 sm:px-3 md:px-4">
                                                  <Skeleton className="h-4 w-16" />
                                              </TableCell>
                                              <TableCell className="border-r px-2 sm:px-3 md:px-4">
                                                  <Skeleton className="h-3 w-24" />
                                              </TableCell>
                                              <TableCell className="border-r px-2 sm:px-3 md:px-4">
                                                  <Skeleton className="h-3 w-8" />
                                              </TableCell>
                                              <TableCell className="border-r px-2 text-center sm:px-3 md:px-4">
                                                  <Skeleton className="mx-auto h-4 w-16" />
                                              </TableCell>
                                              <TableCell className="px-1 text-center">
                                                  <Skeleton className="mx-auto h-6 w-6" />
                                              </TableCell>
                                          </TableRow>
                                      ))
                                    : filteredUsers.map((user: User, idx: number) => {
                                          const roleInfo =
                                              roleConfig[user.role as keyof typeof roleConfig];
                                          const restaurantName =
                                              user.restaurant?.name || "No restaurant";
                                          return (
                                              <TableRow
                                                  key={user.id}
                                                  className="hover:bg-muted/50 h-10 cursor-pointer"
                                                  onClick={() => handleRowClick(user)}
                                              >
                                                  <TableCell className="border-r px-1 text-center">
                                                      <div className="text-muted-foreground text-xs">
                                                          {(currentPage - 1) * pageSize + idx + 1}
                                                      </div>
                                                  </TableCell>
                                                  <TableCell className="border-r px-2 font-mono text-xs font-medium sm:px-3 md:px-4">
                                                      {user.id.slice(-8)}
                                                  </TableCell>
                                                  <TableCell className="border-r px-2 sm:px-3 md:px-4">
                                                      <div className="flex items-center gap-2">
                                                          <div
                                                              className={`h-2 w-2 rounded-full ${user.isActive ? "bg-green-500" : "bg-red-500"}`}
                                                          />
                                                          <span
                                                              className="max-w-40 truncate text-xs md:max-w-none md:overflow-visible md:text-sm"
                                                              title={`${user.firstName} ${user.lastName}`}
                                                          >
                                                              {user.firstName} {user.lastName}
                                                          </span>
                                                      </div>
                                                  </TableCell>
                                                  <TableCell className="border-r px-2 sm:px-3 md:px-4">
                                                      <span
                                                          className="max-w-40 truncate text-xs md:max-w-none md:overflow-visible md:text-sm"
                                                          title={user.email}
                                                      >
                                                          {user.email}
                                                      </span>
                                                  </TableCell>
                                                  <TableCell className="border-r px-2 sm:px-3 md:px-4">
                                                      <div className="text-muted-foreground text-xs">
                                                          {roleInfo.label}
                                                      </div>
                                                  </TableCell>
                                                  <TableCell className="border-r px-2 sm:px-3 md:px-4">
                                                      <div
                                                          className="max-w-40 truncate text-xs md:max-w-none md:overflow-visible md:text-sm"
                                                          title={restaurantName}
                                                      >
                                                          {restaurantName}
                                                      </div>
                                                  </TableCell>
                                                  <TableCell className="border-r px-2 text-center sm:px-3 md:px-4">
                                                      <Badge
                                                          variant={
                                                              user.isActive
                                                                  ? "secondary"
                                                                  : "destructive"
                                                          }
                                                          className="h-5 px-1.5 py-0.5 text-xs"
                                                      >
                                                          {user.isActive ? (
                                                              <>
                                                                  <UserCheck className="mr-1 h-2.5 w-2.5" />
                                                                  Active
                                                              </>
                                                          ) : (
                                                              <>
                                                                  <UserX className="mr-1 h-2.5 w-2.5" />
                                                                  Inactive
                                                              </>
                                                          )}
                                                      </Badge>
                                                  </TableCell>
                                                  <TableCell className="text-muted-foreground border-r px-2 text-center text-xs sm:px-3 md:px-4">
                                                      {new Date(
                                                          user.createdAt,
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
                                                                      setViewingUser(user)
                                                                  }
                                                              >
                                                                  <Eye className="h-4 w-4" />
                                                                  View Details
                                                              </DropdownMenuItem>
                                                              <DropdownMenuItem
                                                                  onClick={() =>
                                                                      setEditingUser(user)
                                                                  }
                                                              >
                                                                  <Edit className="h-4 w-4" />
                                                                  Edit User
                                                              </DropdownMenuItem>
                                                              <DropdownMenuItem
                                                                  onClick={() =>
                                                                      setDeletingUser(user)
                                                                  }
                                                                  variant="destructive"
                                                              >
                                                                  <Trash2 className="h-4 w-4" />
                                                                  Delete User
                                                              </DropdownMenuItem>
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
                            Page {currentPage} of {totalPages} • {totalCount} total users
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

                                {currentPage > 4 && (
                                    <PaginationItem>
                                        <PaginationEllipsis />
                                    </PaginationItem>
                                )}

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

                                <PaginationItem>
                                    <PaginationLink isActive className="h-8 w-8 p-0">
                                        {currentPage}
                                    </PaginationLink>
                                </PaginationItem>

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

                                {currentPage < totalPages - 3 && (
                                    <PaginationItem>
                                        <PaginationEllipsis />
                                    </PaginationItem>
                                )}

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

            {/* User Details Sheet */}
            <Sheet open={!!viewingUser} onOpenChange={() => setViewingUser(null)}>
                <SheetContent>
                    <SheetHeader className="border-border border-b">
                        <SheetTitle>User Details</SheetTitle>
                        <SheetDescription>
                            {viewingUser?.firstName} {viewingUser?.lastName} • {viewingUser?.email}
                        </SheetDescription>
                    </SheetHeader>

                    <div className="p-4">
                        {viewingUser && (
                            <div className="space-y-6">
                                {/* User Info */}
                                <div className="space-y-2">
                                    <h4 className="text-muted-foreground text-sm font-semibold tracking-wide uppercase">
                                        Basic Information
                                    </h4>
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-1 text-sm">
                                            <User className="size-4" />
                                            <div className="font-medium">
                                                {viewingUser.firstName} {viewingUser.lastName}
                                            </div>
                                        </div>
                                        <div className="text-muted-foreground flex items-center gap-1 text-sm">
                                            <Mail className="size-4" />
                                            {viewingUser.email}
                                        </div>
                                        <div className="text-muted-foreground text-sm">
                                            ID: {viewingUser.id.slice(-8)}
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <h4 className="text-muted-foreground text-sm font-semibold tracking-wide uppercase">
                                        Status & Role
                                    </h4>
                                    <div className="space-y-2">
                                        <Badge
                                            variant={
                                                roleConfig[
                                                    viewingUser.role as keyof typeof roleConfig
                                                ].color as
                                                    | "secondary"
                                                    | "default"
                                                    | "outline"
                                                    | "destructive"
                                            }
                                            className="mr-2 w-fit"
                                        >
                                            {
                                                roleConfig[
                                                    viewingUser.role as keyof typeof roleConfig
                                                ].label
                                            }
                                        </Badge>
                                        <Badge
                                            variant={viewingUser.isActive ? "default" : "secondary"}
                                            className="w-fit"
                                        >
                                            {viewingUser.isActive ? "Active" : "Inactive"}
                                        </Badge>
                                    </div>
                                </div>

                                {/* Restaurant */}
                                {viewingUser.restaurantId && (
                                    <div className="space-y-2">
                                        <h4 className="text-muted-foreground text-sm font-semibold tracking-wide uppercase">
                                            Restaurant
                                        </h4>
                                        <div className="font-medium">
                                            {viewingUser.restaurant?.name || "Unknown Restaurant"}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <SheetFooter className="border-border border-t">
                        <SheetClose asChild>
                            <Button variant="outline">Close</Button>
                        </SheetClose>
                    </SheetFooter>
                </SheetContent>
            </Sheet>

            {/* Edit User Sheet */}
            <Sheet open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
                <SheetContent>
                    <SheetHeader className="border-border border-b">
                        <SheetTitle>Edit User</SheetTitle>
                        <SheetDescription>
                            Update user information and permissions.
                        </SheetDescription>
                    </SheetHeader>

                    <div className="p-4">
                        {editingUser &&
                            (() => {
                                const user = editingUser;
                                return (
                                    <EditUserForm
                                        user={user}
                                        onSubmit={(updates) => handleUpdateUser(user.id, updates)}
                                        onCancel={() => setEditingUser(null)}
                                        loading={updating}
                                    />
                                );
                            })()}
                    </div>

                    <SheetFooter className="border-border border-t">
                        <Button type="submit" form="edit-user-form" disabled={updating}>
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
            <Dialog open={!!deletingUser} onOpenChange={() => setDeletingUser(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete User</DialogTitle>
                        <DialogDescription>
                            This action cannot be undone. To confirm deletion, please enter the user
                            name and location below.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Alert variant="destructive">
                                <AlertDescription>
                                    This will permanently delete the user and related resources like
                                    orders.
                                </AlertDescription>
                            </Alert>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="delete-name">
                                To confirm, type{" "}
                                <span className="font-semibold">
                                    &quot;{deletingUser?.firstName} {deletingUser?.lastName}&quot;
                                </span>
                            </Label>
                            <Input
                                id="delete-name"
                                value={deleteConfirmName}
                                onChange={(e) => setDeleteConfirmName(e.target.value)}
                                placeholder={`Type ${deletingUser?.firstName} ${deletingUser?.lastName}`}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="delete-phrase">
                                To confirm, type{" "}
                                <span className="font-semibold">&quot;delete my user&quot;</span>
                            </Label>
                            <Input
                                id="delete-phrase"
                                value={deleteConfirmPhrase}
                                onChange={(e) => setDeleteConfirmPhrase(e.target.value)}
                                placeholder="Type delete my user"
                            />
                        </div>
                    </div>
                    <DialogFooter className="flex w-full sm:justify-between">
                        <Button
                            variant="outline"
                            onClick={() => setDeletingUser(null)}
                            disabled={deleting}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDeleteUser}
                            disabled={
                                deleting ||
                                deleteConfirmName !==
                                    deletingUser?.firstName + " " + deletingUser?.lastName ||
                                deleteConfirmPhrase !== "delete my user"
                            }
                        >
                            {deleting ? (
                                <span className="flex items-center">
                                    <Spinner className="mr-2" /> Deleting
                                </span>
                            ) : (
                                "Delete User"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

const GET_RESTAURANTS = gql`
    query GetRestaurants {
        restaurants {
            restaurants {
                id
                name
            }
        }
    }
`;

type RestaurantsData = {
    restaurants: {
        restaurants: Array<{
            id: string;
            name: string;
        }>;
    };
};

function EditUserForm({
    user,
    restaurants = [],
    onSubmit,
    onCancel,
    loading,
}: {
    user: User;
    restaurants?: Array<{ id: string; name: string }>;
    onSubmit: (updates: UserUpdates) => void;
    onCancel: () => void;
    loading: boolean;
}) {
    const { data: restaurantsData } = useQuery<RestaurantsData>(GET_RESTAURANTS);
    const availableRestaurants = restaurantsData?.restaurants?.restaurants || [];

    const [showPassword, setShowPassword] = useState(false);

    const form = useForm<UserFormData>({
        resolver: zodResolver(userSchema),
        defaultValues: {
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role as "ADMIN" | "MANAGER" | "MEMBER",
            restaurantId: user.restaurantId || "",
            isActive: user.isActive,
        },
    });

    const watchedRole = form.watch("role");

    const handleSubmit = (values: UserFormData) => {
        // Validate restaurant requirement based on role
        if (
            (values.role === "MANAGER" || values.role === "MEMBER") &&
            (!values.restaurantId || values.restaurantId === "none")
        ) {
            form.setError("restaurantId", {
                type: "manual",
                message: "Restaurant is required for this role",
            });
            return;
        }

        const updates: UserUpdates = {};

        if (values.firstName !== user.firstName) updates.firstName = values.firstName;
        if (values.lastName !== user.lastName) updates.lastName = values.lastName;
        if (values.email !== user.email) updates.email = values.email;
        if (values.password && values.password.trim() !== "") updates.password = values.password;
        if (values.role !== user.role) updates.role = values.role;
        if (values.restaurantId !== (user.restaurantId || "none")) {
            updates.restaurantId = values.restaurantId === "none" ? null : values.restaurantId;
        }
        if (values.isActive !== user.isActive) updates.isActive = values.isActive;

        if (Object.keys(updates).length > 0) {
            onSubmit(updates);
        } else {
            onCancel();
        }
    };

    return (
        <Form {...form}>
            <form
                id="edit-user-form"
                onSubmit={form.handleSubmit(handleSubmit)}
                className="space-y-4"
            >
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>
                                    First Name <span className="text-destructive">*</span>
                                </FormLabel>
                                <FormControl>
                                    <Input placeholder="Enter first name" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="lastName"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>
                                    Last Name <span className="text-destructive">*</span>
                                </FormLabel>
                                <FormControl>
                                    <Input placeholder="Enter last name" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>
                                Email <span className="text-destructive">*</span>
                            </FormLabel>
                            <FormControl>
                                <Input type="email" placeholder="Enter email address" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                                <div className="relative">
                                    <Input
                                        type={showPassword ? "text" : "password"}
                                        placeholder="Leave blank to keep current password"
                                        className="pr-10"
                                        {...field}
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="absolute top-0 right-0 h-full hover:bg-transparent!"
                                        onClick={() => setShowPassword(!showPassword)}
                                        aria-label={
                                            showPassword ? "Hide password" : "Show password"
                                        }
                                    >
                                        {showPassword ? (
                                            <EyeOff className="h-4 w-4" />
                                        ) : (
                                            <Eye className="h-4 w-4" />
                                        )}
                                    </Button>
                                </div>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>
                                Role <span className="text-destructive">*</span>
                            </FormLabel>
                            <FormControl>
                                <Select value={field.value} onValueChange={field.onChange}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select a role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ADMIN">Admin</SelectItem>
                                        <SelectItem value="MANAGER">Manager</SelectItem>
                                        <SelectItem value="MEMBER">Member</SelectItem>
                                    </SelectContent>
                                </Select>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="restaurantId"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>
                                Restaurant{" "}
                                {watchedRole === "MANAGER" || watchedRole === "MEMBER" ? (
                                    <span className="text-destructive">*</span>
                                ) : null}
                            </FormLabel>
                            <FormControl>
                                <Select
                                    value={field.value || "none"}
                                    onValueChange={field.onChange}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select restaurant" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">No restaurant</SelectItem>
                                        {availableRestaurants.map((restaurant) => (
                                            <SelectItem key={restaurant.id} value={restaurant.id}>
                                                {restaurant.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                        <FormItem className="flex items-center justify-between">
                            <div>
                                <FormLabel>Active</FormLabel>
                                <FormDescription className="text-muted-foreground mt-1 text-sm">
                                    Whether the user can log in and access
                                </FormDescription>
                            </div>
                            <FormControl>
                                <Switch
                                    checked={!!field.value}
                                    onCheckedChange={(checked) => field.onChange(checked)}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </form>
        </Form>
    );
}
