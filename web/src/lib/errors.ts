// Shared client-side error utilities
// Keep this file small and focused so multiple pages/components can import
// a consistent error message extractor for toasts and logs.

export type GraphQLErrorLike = {
    graphQLErrors?: Array<{ message?: string }>;
    networkError?: { message?: string } | null;
    message?: string;
};

/**
 * Extract a readable error message from common error shapes
 * - Error instances
 * - Apollo GraphQLErrors / networkError shapes
 * - Other values (string)
 */
export function extractErrorMessage(err: unknown): string {
    if (!err) return "Unknown error";
    if (typeof err === "string") return err;
    if (err instanceof Error) {
        const e = err as unknown as GraphQLErrorLike;
        if (Array.isArray(e.graphQLErrors) && e.graphQLErrors.length > 0) {
            return e.graphQLErrors.map((g) => g.message || "").join(" | ");
        }
        if (e.networkError?.message) return e.networkError.message;
        return e.message || "Unknown error";
    }

    const anyErr = err as GraphQLErrorLike;
    if (Array.isArray(anyErr?.graphQLErrors) && anyErr.graphQLErrors.length > 0) {
        return anyErr.graphQLErrors.map((g) => g.message || "").join(" | ");
    }
    if (anyErr?.message) return anyErr.message;
    return String(err);
}

export default extractErrorMessage;
