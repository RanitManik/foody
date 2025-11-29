import { gql } from "@apollo/client/core";
import { useMutation } from "@apollo/client/react";
import { useState } from "react";
import { useRouter } from "nextjs-toploader/app";

const LOGIN_MUTATION = gql`
    mutation Login($input: LoginInput!) {
        login(input: $input) {
            token
            user {
                id
                email
                firstName
                lastName
                role
                restaurantId
            }
        }
    }
`;

interface LoginData {
    login: {
        token: string;
        user: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            role: string;
            restaurantId?: string;
        };
    };
}

interface LoginVars {
    input: {
        email: string;
        password: string;
    };
}

export function useAuth() {
    const router = useRouter();
    const [loginMutation, { loading, error }] = useMutation<LoginData, LoginVars>(LOGIN_MUTATION);
    const [authError, setAuthError] = useState<string | null>(null);

    const login = async (data: LoginVars["input"]) => {
        try {
            setAuthError(null);
            const response = await loginMutation({
                variables: {
                    input: {
                        email: data.email,
                        password: data.password,
                    },
                },
            });

            if (response.data?.login) {
                const { token, user } = response.data.login;
                // Set token in cookie for middleware access
                document.cookie = `auth_token=${token}; path=/; max-age=86400; samesite=strict`; // 24 hours
                localStorage.setItem("auth_token", token); // Keep for backward compatibility and Apollo
                localStorage.setItem("user_role", user.role);
                localStorage.setItem("user_data", JSON.stringify(user));

                if (typeof window !== "undefined") {
                    window.dispatchEvent(new Event("auth-changed"));
                }

                // Redirect based on role
                if (user.role === "ADMIN") {
                    router.push("/admin/dashboard");
                } else if (user.restaurantId) {
                    router.push(`/restaurant/${user.restaurantId}/orders`);
                } else {
                    // Fallback if no restaurant ID for non-admin (shouldn't happen based on schema but good safety)
                    router.push("/");
                }
            }
        } catch (err) {
            console.error("Login error:", err);
            setAuthError(err instanceof Error ? err.message : "An error occurred during login");
        }
    };

    const logout = () => {
        // Clear cookie
        document.cookie = "auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        localStorage.removeItem("auth_token");
        localStorage.removeItem("user_role");
        localStorage.removeItem("user_data");

        if (typeof window !== "undefined") {
            window.dispatchEvent(new Event("auth-changed"));
        }
        router.push("/login");
    };

    return {
        login,
        logout,
        loading,
        error: authError || error?.message,
    };
}
