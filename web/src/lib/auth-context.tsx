"use client";

import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
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
    hasToken: boolean;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function getStoredUser(): User | null {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem("user_data");
    if (!raw) return null;
    try {
        return JSON.parse(raw) as User;
    } catch (error) {
        console.warn("Failed to parse stored user", error);
        localStorage.removeItem("user_data");
        return null;
    }
}

function getCookie(name: string): string | null {
    if (typeof window === "undefined") return null;
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(";").shift() || null;
    return null;
}

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
    const [user, setUser] = useState<User | null>(() => getStoredUser());
    const [token, setToken] = useState<string | null>(() => getCookie("auth_token"));

    const hasToken = useMemo(() => Boolean(token), [token]);

    const { data, loading, error, refetch } = useQuery<{ me: User }>(ME_QUERY, {
        skip: typeof window === "undefined" || !hasToken,
        fetchPolicy: "cache-first",
    });

    useEffect(() => {
        if (!hasToken) {
            setUser(null);
            if (typeof window !== "undefined") {
                localStorage.removeItem("user_data");
            }
        }
    }, [hasToken]);

    useEffect(() => {
        if (data?.me) {
            setUser(data.me);
            if (typeof window !== "undefined") {
                localStorage.setItem("user_data", JSON.stringify(data.me));
                localStorage.setItem("user_role", data.me.role);
            }
        }
    }, [data]);

    useEffect(() => {
        if (error) {
            // Token might be invalid, clear it and return to login
            if (typeof window !== "undefined") {
                document.cookie = "auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
                localStorage.removeItem("auth_token");
                localStorage.removeItem("user_role");
                localStorage.removeItem("user_data");
            }
            setUser(null);
            setToken(null);
            router.push("/login");
        }
    }, [error, router]);

    useEffect(() => {
        const handleAuthChange = () => {
            const nextToken = getCookie("auth_token");
            setToken(nextToken);

            if (nextToken) {
                // Prime user state from storage for instant availability
                const storedUser = getStoredUser();
                if (storedUser) {
                    setUser(storedUser);
                }

                // Ensure we sync with server
                refetch().catch((refetchError) => {
                    console.warn("Failed to refetch user after auth change", refetchError);
                });
            } else {
                setUser(null);
            }
        };

        if (typeof window !== "undefined") {
            window.addEventListener("auth-changed", handleAuthChange);
        }

        return () => {
            if (typeof window !== "undefined") {
                window.removeEventListener("auth-changed", handleAuthChange);
            }
        };
    }, [refetch]);

    useEffect(() => {
        if (typeof window !== "undefined") {
            // Sync initial token state if cookies change after hydration
            const nextToken = getCookie("auth_token");
            if (nextToken !== token) {
                setToken(nextToken);
            }
        }
    }, [token]);

    const logout = () => {
        if (typeof window !== "undefined") {
            // Clear cookie
            document.cookie = "auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
            localStorage.removeItem("auth_token");
            localStorage.removeItem("user_role");
            localStorage.removeItem("user_data");
        }
        setUser(null);
        setToken(null);
        if (typeof window !== "undefined") {
            window.dispatchEvent(new Event("auth-changed"));
        }
        router.push("/login");
    };

    const isAuthenticating = hasToken && (loading || (!user && !error));

    const value = {
        user,
        loading: isAuthenticating,
        hasToken,
        logout,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
