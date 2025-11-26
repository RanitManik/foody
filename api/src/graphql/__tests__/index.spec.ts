// Mock graphql-tools
jest.mock("@graphql-tools/merge", () => ({
    mergeTypeDefs: jest.fn(),
    mergeResolvers: jest.fn(),
}));

// Mock all the imported modules
jest.mock("../scalars", () => ({
    scalarTypeDefs: "scalarTypeDefs",
    scalarResolvers: { scalarResolvers: true },
}));

jest.mock("../auth/schema", () => ({ typeDefs: "authTypeDefs" }));
jest.mock("../auth/resolver", () => ({ authResolvers: { auth: true } }));
jest.mock("../menu/schema", () => ({ typeDefs: "menuTypeDefs" }));
jest.mock("../menu/resolver", () => ({ menuResolvers: { menu: true } }));
jest.mock("../order/schema", () => ({ typeDefs: "orderTypeDefs" }));
jest.mock("../order/resolver", () => ({ orderResolvers: { order: true } }));
jest.mock("../payment/schema", () => ({ typeDefs: "paymentTypeDefs" }));
jest.mock("../payment/resolver", () => ({ paymentResolvers: { payment: true } }));
jest.mock("../restaurant/schema", () => ({ typeDefs: "restaurantTypeDefs" }));
jest.mock("../restaurant/resolver", () => ({ restaurantResolvers: { restaurant: true } }));
jest.mock("../feedback/schema", () => ({ typeDefs: "feedbackTypeDefs" }));
jest.mock("../feedback/resolver", () => ({ feedbackResolvers: { feedback: true } }));
jest.mock("../user/schema", () => ({ typeDefs: "userTypeDefs" }));
jest.mock("../user/resolver", () => ({ userResolvers: { user: true } }));

import { mergeTypeDefs, mergeResolvers } from "@graphql-tools/merge";

const mockMergeTypeDefs = mergeTypeDefs as jest.MockedFunction<typeof mergeTypeDefs>;
const mockMergeResolvers = mergeResolvers as jest.MockedFunction<typeof mergeResolvers>;

describe("GraphQL Index", () => {
    let graphqlModule: { typeDefs: unknown; resolvers: unknown };

    beforeAll(() => {
        // Set mock return values
        mockMergeTypeDefs.mockReturnValue({} as unknown);
        mockMergeResolvers.mockReturnValue({} as unknown);
        // Import the module to trigger initialization
        graphqlModule = require("../index");
    });

    it("should merge all typeDefs", () => {
        expect(mockMergeTypeDefs).toHaveBeenCalledWith([
            "scalarTypeDefs",
            "authTypeDefs",
            "menuTypeDefs",
            "orderTypeDefs",
            "paymentTypeDefs",
            "restaurantTypeDefs",
            "feedbackTypeDefs",
            "userTypeDefs",
        ]);
    });

    it("should merge all resolvers", () => {
        expect(mockMergeResolvers).toHaveBeenCalledWith([
            { scalarResolvers: true },
            { auth: true },
            { menu: true },
            { order: true },
            { payment: true },
            { restaurant: true },
            { feedback: true },
            { user: true },
        ]);
    });

    it("should export typeDefs and resolvers", () => {
        expect(graphqlModule.typeDefs).toBeDefined();
        expect(graphqlModule.resolvers).toBeDefined();
    });
});
