import React from "react";
import { render } from "@testing-library/react";
import Page from "../src/app/page";

// Mock Next.js App Router context
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
    useRouter: () => ({
        push: mockPush,
        replace: jest.fn(),
        back: jest.fn(),
        forward: jest.fn(),
        refresh: jest.fn(),
        prefetch: jest.fn(),
    }),
    usePathname: () => "/",
    useSearchParams: () => new URLSearchParams(),
}));

// Mock localStorage
const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
    length: 0,
    key: jest.fn(),
};
Object.defineProperty(window, "localStorage", {
    value: localStorageMock,
});

describe("Page", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        localStorageMock.getItem.mockClear();
        localStorageMock.setItem.mockClear();
    });

    it("should render successfully", () => {
        const { baseElement } = render(<Page />);
        expect(baseElement).toBeTruthy();
    });

    it("should redirect to login if no token", () => {
        localStorageMock.getItem.mockReturnValue(null);

        render(<Page />);

        expect(mockPush).toHaveBeenCalledWith("/login");
    });

    it("should redirect admin to dashboard page", () => {
        localStorageMock.getItem
            .mockReturnValueOnce("token") // auth_token
            .mockReturnValueOnce("ADMIN"); // user_role

        render(<Page />);

        expect(mockPush).toHaveBeenCalledWith("/admin/dashboard");
    });

    it("should redirect restaurant user to orders page", () => {
        localStorageMock.getItem
            .mockReturnValueOnce("token") // auth_token
            .mockReturnValueOnce("MANAGER") // user_role
            .mockReturnValueOnce(JSON.stringify({ restaurantId: "123" })); // user_data

        render(<Page />);

        expect(mockPush).toHaveBeenCalledWith("/restaurant/123/orders");
    });
});
