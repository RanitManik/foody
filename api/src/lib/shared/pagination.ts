import { z } from "zod";

/**
 * Pagination input schema
 */
export const PaginationInputSchema = z.object({
    first: z.number().int().positive().max(100).optional(),
    skip: z.number().int().nonnegative().optional(),
    after: z.cuid().optional(),
});

export type PaginationInput = z.infer<typeof PaginationInputSchema>;

/**
 * Pagination result type
 */
export interface PaginationResult<T> {
    items: T[];
    totalCount?: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor?: string;
    endCursor?: string;
}

/**
 * Default pagination values
 */
export const DEFAULT_PAGINATION = {
    first: 20,
    skip: 0,
} as const;

/**
 * Parse and validate pagination input
 */
export function parsePagination(input?: PaginationInput) {
    if (!input) {
        return DEFAULT_PAGINATION;
    }

    const validated = PaginationInputSchema.parse(input);
    return {
        first: validated.first ?? DEFAULT_PAGINATION.first,
        skip: validated.skip ?? DEFAULT_PAGINATION.skip,
    };
}
