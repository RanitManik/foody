"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";

const formSchema = z.object({
    email: z.string().email({
        message: "Please enter a valid email address.",
    }),
    password: z.string().min(1, {
        message: "Password is required.",
    }),
});

const DEMO_ACCOUNTS = [
    {
        label: "Admin User",
        email: "admin@foody.com",
        password: "ChangeMe123!",
        role: "ADMIN",
    },
    {
        label: "Manager (Spice Garden)",
        email: "captain.marvel@foody.com",
        password: "ChangeMe123!",
        role: "MANAGER",
    },
    {
        label: "Manager (Burger Haven)",
        email: "captain.america@foody.com",
        password: "ChangeMe123!",
        role: "MANAGER",
    },
    {
        label: "Member (Spice Garden)",
        email: "thanos@foody.com",
        password: "ChangeMe123!",
        role: "MEMBER",
    },
    {
        label: "Member (Burger Haven)",
        email: "travis@foody.com",
        password: "ChangeMe123!",
        role: "MEMBER",
    },
];

export function LoginForm() {
    const { login, loading, error } = useAuth();
    const [showPassword, setShowPassword] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            email: "",
            password: "",
        },
    });

    function onSubmit(values: z.infer<typeof formSchema>) {
        login(values);
    }

    const handleDemoAccountSelect = (value: string) => {
        const account = DEMO_ACCOUNTS.find((acc) => acc.email === value);
        if (account) {
            form.setValue("email", account.email);
            form.setValue("password", account.password);
        }
    };

    return (
        <div className="grid gap-6">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Email</FormLabel>
                                <FormControl>
                                    <Input placeholder="name@example.com" {...field} />
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
                                            placeholder="Enter your password"
                                            {...field}
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="absolute top-0 right-0 h-full px-3 py-2 hover:bg-transparent"
                                            onClick={() => setShowPassword(!showPassword)}
                                        >
                                            {showPassword ? (
                                                <EyeOff className="text-muted-foreground h-4 w-4" />
                                            ) : (
                                                <Eye className="text-muted-foreground h-4 w-4" />
                                            )}
                                            <span className="sr-only">
                                                {showPassword ? "Hide password" : "Show password"}
                                            </span>
                                        </Button>
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {error && (
                        <Alert variant="destructive">
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                        Sign in
                    </Button>
                </form>
            </Form>

            <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background text-muted-foreground px-2">
                        Or continue with
                    </span>
                </div>
            </div>

            <Select onValueChange={handleDemoAccountSelect}>
                <SelectTrigger className="w-full">
                    <SelectValue placeholder="Demo Test Accounts" />
                </SelectTrigger>
                <SelectContent>
                    {DEMO_ACCOUNTS.map((account) => (
                        <SelectItem key={account.email} value={account.email}>
                            {account.label} ({account.role})
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
