"use client";

import { useState } from "react";
import { z } from "zod";
import { useMutation } from "@apollo/client/react";
import { useRouter } from "next/navigation";
import { LoginForm } from "@/components/block/login-form";
import { LOGIN_MUTATION } from "@/lib/graphql/auth";

const loginSchema = z.object({
    email: z.email("Please enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters long"),
});

interface LoginData {
    login: {
        token: string;
        user: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            role: string;
            restaurantId: string | null;
            isActive: boolean;
            createdAt: string;
            updatedAt: string;
        };
    };
}

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const router = useRouter();

    const [login, { loading }] = useMutation(LOGIN_MUTATION);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        try {
            const validatedData = loginSchema.parse({ email, password });
            const result = await login({
                variables: {
                    input: validatedData,
                },
            });

            if ((result.data as LoginData)?.login?.token) {
                // Store the token in localStorage
                localStorage.setItem("auth_token", (result.data as LoginData).login.token);
                // Redirect to dashboard or home
                router.push("/dashboard");
            } else {
                setError("Login failed: invalid response");
            }
        } catch (err) {
            if (err instanceof z.ZodError) {
                setError(err.issues[0].message);
            } else if (err instanceof Error) {
                setError(err.message || "Login failed");
            } else {
                setError("An unexpected error occurred");
            }
        }
    };

    return (
        <div className="bg-background flex min-h-screen items-center justify-center px-4">
            <div className="w-full max-w-md">
                <LoginForm
                    email={email}
                    password={password}
                    onEmailChange={setEmail}
                    onPasswordChange={setPassword}
                    loading={loading}
                    error={error}
                    onSubmit={handleSubmit}
                />
            </div>
        </div>
    );
}
