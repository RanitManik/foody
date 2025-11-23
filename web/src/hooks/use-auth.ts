import { gql } from "@apollo/client/core";
import { useMutation } from "@apollo/client/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

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
                localStorage.setItem("auth_token", token);
                localStorage.setItem("user_role", user.role);

                // Redirect based on role
                if (user.role === "ADMIN") {
                    router.push("/admin/restaurants");
                } else if (user.restaurantId) {
                    router.push(`/restaurant/${user.restaurantId}/dashboard`);
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
        localStorage.removeItem("auth_token");
        localStorage.removeItem("user_role");
        router.push("/login");
    };

    return {
        login,
        logout,
        loading,
        error: authError || error?.message,
    };
}
