import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { LoginForm } from "@/components/auth/login-form";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

export const metadata: Metadata = {
    title: "Login - Foody",
    description: "Login to your Foody dashboard",
};

export default function LoginPage() {
    return (
        <div className="relative container grid min-h-screen flex-col lg:max-w-none lg:grid-cols-2 lg:px-0">
            <div className="bg-muted relative hidden h-full flex-col p-10 text-white lg:flex dark:border-r">
                <div className="absolute inset-0 bg-zinc-900" />
                <div className="absolute inset-0">
                    <Image
                        src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=2340&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
                        alt="Foody Cover"
                        fill
                        className="object-cover opacity-50"
                        priority
                    />
                </div>
                <div className="relative z-20 mt-auto">
                    <blockquote className="space-y-2">
                        <p className="text-lg">
                            &ldquo;Foody has revolutionized how we manage our restaurant chains. The
                            inventory tracking and real-time analytics have cut our food waste by
                            30% and improved staff efficiency significantly.&rdquo;
                        </p>
                        <footer className="text-sm">Ramesh Kumar</footer>
                    </blockquote>
                </div>
            </div>
            <div className="relative flex h-full flex-col p-4 lg:p-8">
                <div className="flex w-full items-center justify-between">
                    <div className="flex items-center text-lg font-medium">
                        <Logo className="mr-2 h-6 w-6" size={24} />
                        Foody
                    </div>
                    <ThemeToggle />
                </div>
                <div className="mx-auto flex w-full flex-1 flex-col justify-center space-y-6 sm:w-[350px]">
                    <div className="flex flex-col space-y-2 text-center">
                        <h1 className="text-2xl font-semibold tracking-tight">
                            Login to Dashboard
                        </h1>
                        <p className="text-muted-foreground text-sm">
                            Enter your credentials to continue
                        </p>
                    </div>
                    <LoginForm />
                    <p className="text-muted-foreground px-8 text-center text-sm">
                        By clicking continue, you agree to our{" "}
                        <Link
                            href="/terms"
                            className="hover:text-primary underline underline-offset-4"
                        >
                            Terms of Service
                        </Link>{" "}
                        and{" "}
                        <Link
                            href="/privacy"
                            className="hover:text-primary underline underline-offset-4"
                        >
                            Privacy Policy
                        </Link>
                        .
                    </p>
                </div>
            </div>
        </div>
    );
}
