import { ApolloClient, InMemoryCache } from "@apollo/client/core";
import { HttpLink } from "@apollo/client/link/http";
import { SetContextLink } from "@apollo/client/link/context";

const httpLink = new HttpLink({
    uri: process.env.NEXT_PUBLIC_GRAPHQL_URI || "http://localhost:4000/graphql",
});

const authLink = new SetContextLink((prevContext, operation) => {
    const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;

    return {
        headers: {
            ...prevContext.headers,
            ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
    };
});

export const client = new ApolloClient({
    link: authLink.concat(httpLink),
    cache: new InMemoryCache(),
});
