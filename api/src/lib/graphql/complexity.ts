import { ValidationRule } from "graphql";
import { GraphQLError, Kind } from "graphql";

/**
 * GraphQL Query Complexity Calculation
 *
 * This validation rule calculates the complexity of a GraphQL query
 * to prevent expensive queries that could lead to DoS attacks.
 *
 * Complexity is calculated as:
 * - Each field has a base cost of 1
 * - List fields multiply by their limit (or default limit of 10)
 * - Nested fields add to the complexity
 */

interface ComplexityContext {
    complexity: number;
    maxComplexity: number;
}

/**
 * Create a complexity validation rule
 */
export function createComplexityRule(maxComplexity: number): ValidationRule {
    return (context) => {
        const complexityContext: ComplexityContext = {
            complexity: 0,
            maxComplexity,
        };

        return {
            Field: {
                enter(node) {
                    // Base cost for each field
                    complexityContext.complexity += 1;

                    // Check if this field has list arguments (first, limit, etc.)
                    if (node.arguments) {
                        for (const arg of node.arguments) {
                            if (arg.name.value === "first" || arg.name.value === "limit") {
                                if (arg.value.kind === Kind.INT) {
                                    const limit = parseInt(arg.value.value, 10);
                                    if (!isNaN(limit) && limit > 0) {
                                        // Add complexity based on the limit
                                        complexityContext.complexity += Math.min(limit - 1, 100);
                                    }
                                }
                            }
                        }
                    }

                    // Check if the return type is a list
                    const fieldDef = context.getFieldDef();
                    if (fieldDef) {
                        const returnType = fieldDef.type;
                        // If it's a list type and no limit specified, add default complexity
                        if (
                            returnType &&
                            "ofType" in returnType &&
                            !node.arguments?.some(
                                (arg) => arg.name.value === "first" || arg.name.value === "limit",
                            )
                        ) {
                            // Default multiplier for lists without explicit limit
                            complexityContext.complexity += 9; // Assume default of 10 items
                        }
                    }
                },
            },
            Document: {
                leave() {
                    if (complexityContext.complexity > complexityContext.maxComplexity) {
                        context.reportError(
                            new GraphQLError(
                                `Query complexity of ${complexityContext.complexity} exceeds maximum allowed complexity of ${complexityContext.maxComplexity}`,
                                {
                                    extensions: {
                                        code: "QUERY_COMPLEXITY_EXCEEDED",
                                        complexity: complexityContext.complexity,
                                        maxComplexity: complexityContext.maxComplexity,
                                    },
                                },
                            ),
                        );
                    }
                },
            },
        };
    };
}
