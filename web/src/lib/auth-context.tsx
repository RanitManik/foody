"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useQuery } from "@apollo/client/react";
import { gql } from "@apollo/client/core";
import { useRouter } from "next/navigation";

const ME_QUERY = gql`
    query Me {
        me {
            id
            email
            firstName
            lastName
            role
            restaurantId
        }
    }
`;

interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    restaurantId?: string;
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}

interface AuthProviderProps {
    children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);

    const { data, loading } = useQuery(ME_QUERY, {
        skip: typeof window === "undefined" || !localStorage.getItem("auth_token") || isInitialized,
        onCompleted: (data) => {
            if (data?.me) {
                setUser(data.me);
            }
            setIsInitialized(true);
        },
        onError: () => {
            // Token might be invalid, clear it
            if (typeof window !== "undefined") {
                localStorage.removeItem("auth_token");
                localStorage.removeItem("user_role");
            }
            setIsInitialized(true);
        },
    });

    useEffect(() => {
        // If we have data from the query, set the user
        if (data?.me && !user) {
            setUser(data.me);
        }
    }, [data, user]);

    const logout = () => {
        if (typeof window !== "undefined") {
            localStorage.removeItem("auth_token");
            localStorage.removeItem("user_role");
        }
        setUser(null);
        router.push("/login");
    };

    const value = {
        user,
        loading: loading && !isInitialized,
        logout,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
