import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Logo } from "./logo";

export function LoginForm({
    className,
    onSubmit,
    email,
    password,
    onEmailChange,
    onPasswordChange,
    loading = false,
    error,
    onSignUp,
    onForgotPassword,
    ...props
}: React.ComponentProps<"form"> & {
    email?: string;
    password?: string;
    onEmailChange?: (value: string) => void;
    onPasswordChange?: (value: string) => void;
    loading?: boolean;
    error?: string;
    onSignUp?: () => void;
    onForgotPassword?: () => void;
}) {
    return (
        <form className={cn("flex flex-col gap-6", className)} onSubmit={onSubmit} {...props}>
            <div className="flex flex-col items-center gap-2 text-center">
                <Logo className="mx-auto" size={48} />
                <h1 className="text-2xl font-bold">Login to your account</h1>
                <p className="text-muted-foreground text-sm text-balance">
                    Enter your email below to login to your account
                </p>
            </div>
            <div className="grid gap-4">
                <div className="grid gap-3">
                    <Label htmlFor="email">Email</Label>
                    <Input
                        id="email"
                        type="email"
                        placeholder="admin@foody.com"
                        value={email}
                        onChange={(e) => onEmailChange?.(e.target.value)}
                        disabled={loading}
                    />
                </div>
                <div className="grid gap-3">
                    <Label htmlFor="password">Password</Label>
                    <Input
                        id="password"
                        type="password"
                        placeholder="ChangeMe123!"
                        value={password}
                        onChange={(e) => onPasswordChange?.(e.target.value)}
                        disabled={loading}
                    />
                </div>
                {error && (
                    <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}
                <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Logging in...
                        </>
                    ) : (
                        "Login"
                    )}
                </Button>
            </div>
        </form>
    );
}
