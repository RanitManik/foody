import { paymentResolvers } from "../resolver";
import { UserRole, PaymentStatus, OrderStatus } from "@prisma/client";

// Mock dependencies
jest.mock("../../../lib/database", () => ({
    prisma: {
        payment_methods: {
            findMany: jest.fn(),
            findUnique: jest.fn(),
            findFirst: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            updateMany: jest.fn(),
            delete: jest.fn(),
            count: jest.fn(),
        },
        payments: {
            findMany: jest.fn(),
            findUnique: jest.fn(),
            findFirst: jest.fn(),
            create: jest.fn(),
            count: jest.fn(),
        },
        orders: {
            findUnique: jest.fn(),
            update: jest.fn(),
        },
        $transaction: jest.fn(),
    },
}));

jest.mock("../../../lib/shared/logger", () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));

jest.mock("../../../lib/shared/errors", () => ({
    GraphQLErrors: {
        unauthenticated: jest.fn(),
        badInput: jest.fn(),
        forbidden: jest.fn(),
        notFound: jest.fn(),
    },
}));

jest.mock("../../../lib/shared/validation", () => ({
    validateInput: jest.fn(),
    CreatePaymentMethodInputSchema: {
        partial: jest.fn().mockReturnValue({
            parse: jest.fn().mockImplementation((input) => input),
        }),
    },
    validationSchemas: {
        id: {},
        nonEmptyString: {},
    },
}));

jest.mock("../../../lib/shared/cache", () => ({
    deleteCacheByPattern: jest.fn(),
}));

import { prisma } from "../../../lib/database";
import { GraphQLErrors } from "../../../lib/shared/errors";
import { validateInput, validationSchemas } from "../../../lib/shared/validation";
import { deleteCacheByPattern } from "../../../lib/shared/cache";
import type { GraphQLContext } from "../../../types/graphql";

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockGraphQLErrors = GraphQLErrors as jest.Mocked<typeof GraphQLErrors>;
const mockValidateInput = validateInput as jest.Mock;
const mockDeleteCacheByPattern = deleteCacheByPattern as jest.Mock;

const createContext = (overrides: Partial<GraphQLContext> = {}): GraphQLContext => ({
    prisma: mockPrisma as unknown as GraphQLContext["prisma"],
    user: null,
    ...overrides,
});

const buildAdminUser = () => ({
    id: "admin-123",
    email: "admin@example.com",
    role: UserRole.ADMIN,
    restaurantId: null,
    firstName: "Admin",
    lastName: "User",
    isActive: true,
    password: "hashed-password",
    createdAt: new Date(),
    updatedAt: new Date(),
});

const buildManagerUser = () => ({
    id: "manager-123",
    email: "manager@example.com",
    role: UserRole.MANAGER,
    restaurantId: "restaurant-123",
    firstName: "Manager",
    lastName: "User",
    isActive: true,
    password: "hashed-password",
    createdAt: new Date(),
    updatedAt: new Date(),
});

const buildMemberUser = () => ({
    id: "member-123",
    email: "member@example.com",
    role: UserRole.MEMBER,
    restaurantId: "restaurant-123",
    firstName: "Member",
    lastName: "User",
    isActive: true,
    password: "hashed-password",
    createdAt: new Date(),
    updatedAt: new Date(),
});

describe("Payment Resolvers", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockValidateInput.mockImplementation((schema, input) => input);
        validationSchemas.id.parse = jest.fn().mockImplementation((id) => id);
        validationSchemas.nonEmptyString.parse = jest.fn().mockImplementation((str) => str);
        mockGraphQLErrors.unauthenticated.mockImplementation(() => {
            throw new Error("Not authenticated");
        });
        mockGraphQLErrors.badInput.mockImplementation((msg?: string) => {
            throw new Error(msg || "Bad input");
        });
        mockGraphQLErrors.forbidden.mockImplementation((msg?: string) => {
            throw new Error(msg || "Forbidden");
        });
        mockGraphQLErrors.notFound.mockImplementation((msg?: string) => {
            throw new Error(msg || "Not found");
        });
    });

    describe("Query", () => {
        describe("paymentMethods", () => {
            it("should return payment methods for admin with restaurantId", async () => {
                const mockMethods = [
                    {
                        id: "pm-1",
                        type: "CREDIT_CARD",
                        provider: "STRIPE",
                        last4: "4242",
                        isDefault: true,
                        restaurantId: "restaurant-123",
                    },
                ];

                (mockPrisma.payment_methods.findMany as jest.Mock).mockResolvedValue(mockMethods);

                const context = createContext({ user: buildAdminUser() });
                const result = await paymentResolvers.Query?.paymentMethods?.(
                    null,
                    { restaurantId: "restaurant-123" },
                    context,
                );

                expect(result).toEqual(mockMethods);
                expect(mockPrisma.payment_methods.findMany).toHaveBeenCalledWith({
                    where: { restaurantId: "restaurant-123" },
                    orderBy: { createdAt: "desc" },
                });
            });

            it("should return payment methods for manager", async () => {
                const mockMethods = [
                    {
                        id: "pm-1",
                        type: "CREDIT_CARD",
                        provider: "STRIPE",
                        last4: "4242",
                        isDefault: true,
                        restaurantId: "restaurant-123",
                    },
                ];

                (mockPrisma.payment_methods.findMany as jest.Mock).mockResolvedValue(mockMethods);

                const context = createContext({ user: buildManagerUser() });
                const result = await paymentResolvers.Query?.paymentMethods?.(null, {}, context);

                expect(result).toEqual(mockMethods);
                expect(mockPrisma.payment_methods.findMany).toHaveBeenCalledWith({
                    where: { restaurantId: "restaurant-123" },
                    orderBy: { createdAt: "desc" },
                });
            });

            it("should deny access for member", async () => {
                const context = createContext({ user: buildMemberUser() });

                await expect(
                    paymentResolvers.Query?.paymentMethods?.(null, {}, context),
                ).rejects.toThrow("Only admins and managers can access payment methods");
            });

            it("should require restaurantId for admin", async () => {
                const context = createContext({ user: buildAdminUser() });

                await expect(
                    paymentResolvers.Query?.paymentMethods?.(null, {}, context),
                ).rejects.toThrow("restaurantId is required for admins");
            });

            it("should throw unauthenticated error when not authenticated", async () => {
                const context = createContext();

                await expect(
                    paymentResolvers.Query?.paymentMethods?.(null, {}, context),
                ).rejects.toThrow("Not authenticated");
            });
        });

        describe("paymentMethod", () => {
            it("should return payment method for manager", async () => {
                const mockMethod = {
                    id: "pm-1",
                    type: "CREDIT_CARD",
                    provider: "STRIPE",
                    last4: "4242",
                    isDefault: true,
                    restaurantId: "restaurant-123",
                };

                (mockPrisma.payment_methods.findFirst as jest.Mock).mockResolvedValue(mockMethod);

                const context = createContext({ user: buildManagerUser() });
                const result = await paymentResolvers.Query?.paymentMethod?.(
                    null,
                    { id: "pm-1" },
                    context,
                );

                expect(result).toEqual(mockMethod);
            });

            it("should return null for non-existent payment method", async () => {
                (mockPrisma.payment_methods.findFirst as jest.Mock).mockResolvedValue(null);

                const context = createContext({ user: buildManagerUser() });

                await expect(
                    paymentResolvers.Query?.paymentMethod?.(null, { id: "pm-1" }, context),
                ).rejects.toThrow("Payment method not found");
            });

            it("should deny access for admin without restaurantId", async () => {
                const context = createContext({ user: buildAdminUser() });

                await expect(
                    paymentResolvers.Query?.paymentMethod?.(null, { id: "pm-1" }, context),
                ).rejects.toThrow("restaurantId is required for admins to access payment methods");
            });
        });

        describe("payments", () => {
            it("should return all payments for admin", async () => {
                const mockPayments = [
                    {
                        id: "pay-1",
                        amount: 45.99,
                        status: PaymentStatus.COMPLETED,
                        transactionId: "txn_123",
                        payment_methods: { id: "pm-1", type: "CREDIT_CARD" },
                        orders: { id: "order-1", totalAmount: 45.99 },
                    },
                ];

                (mockPrisma.payments.findMany as jest.Mock).mockResolvedValue(mockPayments);

                const context = createContext({ user: buildAdminUser() });
                const result = await paymentResolvers.Query?.payments?.(null, {}, context);

                expect(result).toEqual(mockPayments);
            });

            it("should deny access for non-admin", async () => {
                const context = createContext({ user: buildManagerUser() });

                await expect(paymentResolvers.Query?.payments?.(null, {}, context)).rejects.toThrow(
                    "Admin access required",
                );
            });
        });

        describe("payment", () => {
            it("should return payment for admin", async () => {
                const mockPayment = {
                    id: "pay-1",
                    amount: 45.99,
                    status: PaymentStatus.COMPLETED,
                    transactionId: "txn_123",
                    payment_methods: {
                        id: "pm-1",
                        type: "CREDIT_CARD",
                        provider: "STRIPE",
                        last4: "4242",
                        restaurantId: "rest-1",
                    },
                    orders: {
                        id: "order-1",
                        userId: "user-1",
                        restaurantId: "rest-1",
                        status: OrderStatus.PENDING,
                        totalAmount: 45.99,
                        phone: "123-456-7890",
                        specialInstructions: null,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        users: {
                            id: "user-1",
                            email: "user@example.com",
                            firstName: "John",
                            lastName: "Doe",
                            role: UserRole.MEMBER,
                            restaurantId: "rest-1",
                        },
                    },
                };

                (mockPrisma.payments.findFirst as jest.Mock).mockResolvedValue(mockPayment);

                const context = createContext({ user: buildAdminUser() });
                const result = await paymentResolvers.Query?.payment?.(
                    null,
                    { id: "pay-1" },
                    context,
                );

                expect(result).toEqual(mockPayment);
            });

            it("should return payment for order owner", async () => {
                const mockPayment = {
                    id: "pay-1",
                    amount: 45.99,
                    status: PaymentStatus.COMPLETED,
                    transactionId: "txn_123",
                    payment_methods: {
                        id: "pm-1",
                        type: "CREDIT_CARD",
                        provider: "STRIPE",
                        last4: "4242",
                        restaurantId: "rest-1",
                    },
                    orders: {
                        id: "order-1",
                        userId: "member-123",
                        restaurantId: "rest-1",
                        status: OrderStatus.PENDING,
                        totalAmount: 45.99,
                        phone: "123-456-7890",
                        specialInstructions: null,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        users: {
                            id: "member-123",
                            email: "member@example.com",
                            firstName: "Member",
                            lastName: "User",
                            role: UserRole.MEMBER,
                            restaurantId: "rest-1",
                        },
                    },
                };

                (mockPrisma.payments.findFirst as jest.Mock).mockResolvedValue(mockPayment);

                const context = createContext({ user: buildMemberUser() });
                const result = await paymentResolvers.Query?.payment?.(
                    null,
                    { id: "pay-1" },
                    context,
                );

                expect(result).toEqual(mockPayment);
            });

            it("should deny access for unauthorized user", async () => {
                const mockPayment = {
                    id: "pay-1",
                    amount: 45.99,
                    status: PaymentStatus.COMPLETED,
                    transactionId: "txn_123",
                    payment_methods: {
                        id: "pm-1",
                        type: "CREDIT_CARD",
                        provider: "STRIPE",
                        last4: "4242",
                        restaurantId: "rest-1",
                    },
                    orders: {
                        id: "order-1",
                        userId: "other-user",
                        restaurantId: "rest-1",
                        status: OrderStatus.PENDING,
                        totalAmount: 45.99,
                        phone: "123-456-7890",
                        specialInstructions: null,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        users: {
                            id: "other-user",
                            email: "other@example.com",
                            firstName: "Other",
                            lastName: "User",
                            role: UserRole.MEMBER,
                            restaurantId: "rest-1",
                        },
                    },
                };

                (mockPrisma.payments.findFirst as jest.Mock).mockResolvedValue(mockPayment);

                const context = createContext({ user: buildMemberUser() });

                await expect(
                    paymentResolvers.Query?.payment?.(null, { id: "pay-1" }, context),
                ).rejects.toThrow("Access denied");
            });
        });
    });

    describe("Mutation", () => {
        describe("createPaymentMethod", () => {
            const validInput = {
                type: "CREDIT_CARD",
                provider: "STRIPE",
                token: "tok_visa",
            };

            it("should create payment method for admin", async () => {
                const mockCreatedMethod = {
                    id: "pm-new",
                    restaurantId: "restaurant-123",
                    type: "CREDIT_CARD",
                    provider: "STRIPE",
                    last4: "4242",
                    isDefault: false,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                };

                (mockPrisma.payment_methods.create as jest.Mock).mockResolvedValue(
                    mockCreatedMethod,
                );

                const context = createContext({ user: buildAdminUser() });
                const result = await paymentResolvers.Mutation?.createPaymentMethod?.(
                    null,
                    { input: validInput, restaurantId: "restaurant-123" },
                    context,
                );

                expect(result).toEqual(mockCreatedMethod);
            });

            it("should deny creation for non-admin", async () => {
                const context = createContext({ user: buildManagerUser() });

                await expect(
                    paymentResolvers.Mutation?.createPaymentMethod?.(
                        null,
                        { input: validInput, restaurantId: "restaurant-123" },
                        context,
                    ),
                ).rejects.toThrow("Only admins can manage payment methods");
            });

            it("should require restaurantId", async () => {
                const context = createContext({ user: buildAdminUser() });

                await expect(
                    paymentResolvers.Mutation?.createPaymentMethod?.(
                        null,
                        { input: validInput },
                        context,
                    ),
                ).rejects.toThrow("restaurantId is required");
            });
        });

        describe("updatePaymentMethod", () => {
            it("should update payment method for admin", async () => {
                const mockMethod = {
                    id: "pm-1",
                    restaurantId: "restaurant-123",
                    type: "CREDIT_CARD",
                    provider: "STRIPE",
                    last4: "4242",
                    isDefault: false,
                };
                const updatedMethod = { ...mockMethod, isDefault: true };

                (mockPrisma.payment_methods.findUnique as jest.Mock).mockResolvedValue(mockMethod);
                (mockPrisma.payment_methods.updateMany as jest.Mock).mockResolvedValue({
                    count: 1,
                });
                (mockPrisma.payment_methods.update as jest.Mock).mockResolvedValue(updatedMethod);

                const context = createContext({ user: buildAdminUser() });
                const result = await paymentResolvers.Mutation?.updatePaymentMethod?.(
                    null,
                    { id: "pm-1", input: { isDefault: true } },
                    context,
                );

                expect(result).toEqual(updatedMethod);
            });

            it("should deny update for non-admin", async () => {
                const context = createContext({ user: buildManagerUser() });

                await expect(
                    paymentResolvers.Mutation?.updatePaymentMethod?.(
                        null,
                        { id: "pm-1", input: { isDefault: true } },
                        context,
                    ),
                ).rejects.toThrow("Admin access required to update payment methods");
            });
        });

        describe("deletePaymentMethod", () => {
            it("should delete payment method for admin", async () => {
                const mockMethod = {
                    id: "pm-1",
                    restaurantId: "restaurant-123",
                    provider: "STRIPE",
                };

                (mockPrisma.payment_methods.findUnique as jest.Mock).mockResolvedValue(mockMethod);
                (mockPrisma.payments.count as jest.Mock).mockResolvedValue(0);

                const context = createContext({ user: buildAdminUser() });
                const result = await paymentResolvers.Mutation?.deletePaymentMethod?.(
                    null,
                    { id: "pm-1" },
                    context,
                );

                expect(result).toBe(true);
                expect(mockPrisma.payment_methods.delete).toHaveBeenCalledWith({
                    where: { id: "pm-1" },
                });
            });

            it("should prevent deletion if payment method has payments", async () => {
                const mockMethod = {
                    id: "pm-1",
                    restaurantId: "restaurant-123",
                    provider: "STRIPE",
                };

                (mockPrisma.payment_methods.findUnique as jest.Mock).mockResolvedValue(mockMethod);
                (mockPrisma.payments.count as jest.Mock).mockResolvedValue(1);

                const context = createContext({ user: buildAdminUser() });

                await expect(
                    paymentResolvers.Mutation?.deletePaymentMethod?.(null, { id: "pm-1" }, context),
                ).rejects.toThrow("Cannot delete payment method that has been used for payments");
            });
        });

        describe("processPayment", () => {
            const paymentInput = {
                orderId: "order-1",
                paymentMethodId: "pm-1",
                amount: 45.99,
            };

            it("should process payment for admin", async () => {
                const mockOrder = {
                    id: "order-1",
                    userId: "user-1",
                    restaurantId: "restaurant-123",
                    totalAmount: 45.99,
                    status: OrderStatus.PENDING,
                    users: { id: "user-1", role: UserRole.MEMBER, restaurantId: "restaurant-123" },
                    order_items: [
                        {
                            menu_items: {
                                restaurants: { id: "restaurant-123", location: "Downtown" },
                            },
                        },
                    ],
                };
                const mockPaymentMethod = {
                    id: "pm-1",
                    restaurantId: "restaurant-123",
                    provider: "STRIPE",
                };
                const mockPayment = {
                    id: "pay-1",
                    orderId: "order-1",
                    paymentMethodId: "pm-1",
                    amount: 45.99,
                    status: PaymentStatus.COMPLETED,
                    transactionId: "txn_123456789",
                    payment_methods: mockPaymentMethod,
                    orders: mockOrder,
                };

                (mockPrisma.orders.findUnique as jest.Mock).mockResolvedValue(mockOrder);
                (mockPrisma.payment_methods.findFirst as jest.Mock).mockResolvedValue(
                    mockPaymentMethod,
                );
                (mockPrisma.payments.findUnique as jest.Mock).mockResolvedValue(null);
                (mockPrisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
                    return await callback(mockPrisma);
                });
                (mockPrisma.payments.create as jest.Mock).mockResolvedValue(mockPayment);
                (mockPrisma.orders.update as jest.Mock).mockResolvedValue({
                    ...mockOrder,
                    status: OrderStatus.COMPLETED,
                });

                const context = createContext({ user: buildAdminUser() });
                const result = await paymentResolvers.Mutation?.processPayment?.(
                    null,
                    { input: paymentInput },
                    context,
                );

                expect(result).toEqual(mockPayment);
                expect(mockDeleteCacheByPattern).toHaveBeenCalledWith("order:order-1:*");
            });

            it("should deny payment processing for member", async () => {
                const context = createContext({ user: buildMemberUser() });

                await expect(
                    paymentResolvers.Mutation?.processPayment?.(
                        null,
                        { input: paymentInput },
                        context,
                    ),
                ).rejects.toThrow("Only admins and managers can process payments");
            });

            it("should prevent duplicate payments", async () => {
                const mockOrder = {
                    id: "order-1",
                    userId: "user-1",
                    restaurantId: "restaurant-123",
                    totalAmount: 45.99,
                    status: OrderStatus.PENDING,
                    users: { id: "user-1", role: UserRole.MEMBER, restaurantId: "restaurant-123" },
                    order_items: [],
                };

                (mockPrisma.orders.findUnique as jest.Mock).mockResolvedValue(mockOrder);
                (mockPrisma.payment_methods.findFirst as jest.Mock).mockResolvedValue({
                    id: "pm-1",
                    restaurantId: "restaurant-123",
                    provider: "STRIPE",
                });
                (mockPrisma.payments.findUnique as jest.Mock).mockResolvedValue({
                    id: "existing-pay",
                    orderId: "order-1",
                });

                const context = createContext({ user: buildAdminUser() });

                await expect(
                    paymentResolvers.Mutation?.processPayment?.(
                        null,
                        { input: paymentInput },
                        context,
                    ),
                ).rejects.toThrow("Order already has a payment");
            });
        });
    });

    describe("Payment", () => {
        describe("method", () => {
            it("should return payment_methods from parent", () => {
                const parent = {
                    payment_methods: { id: "pm-1", type: "CREDIT_CARD" },
                };

                const result = paymentResolvers.Payment?.method?.(parent);

                expect(result).toEqual({ id: "pm-1", type: "CREDIT_CARD" });
            });

            it("should return null if no payment method", () => {
                const parent = {};

                const result = paymentResolvers.Payment?.method?.(parent);

                expect(result).toBeNull();
            });
        });

        describe("order", () => {
            it("should return orders from parent", () => {
                const parent = {
                    orders: { id: "order-1", totalAmount: 45.99 },
                };

                const result = paymentResolvers.Payment?.order?.(parent);

                expect(result).toEqual({ id: "order-1", totalAmount: 45.99 });
            });

            it("should return null if no order", () => {
                const parent = {};

                const result = paymentResolvers.Payment?.order?.(parent);

                expect(result).toBeNull();
            });
        });
    });
});
