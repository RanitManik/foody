import { gql } from "@apollo/client";

export const LOGIN_MUTATION = gql`
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
                isActive
                createdAt
                updatedAt
            }
        }
    }
`;

export const ME_QUERY = gql`
    query Me {
        me {
            id
            email
            firstName
            lastName
            role
            restaurantId
            isActive
            createdAt
            updatedAt
        }
    }
`;

export const GET_MENU_ITEMS_QUERY = gql`
    query GetMenuItems($restaurantId: ID, $first: Int, $skip: Int) {
        menuItems(restaurantId: $restaurantId, first: $first, skip: $skip) {
            id
            name
            description
            price
            imageUrl
            isAvailable
            category
            restaurant {
                id
                name
                location
            }
            createdAt
            updatedAt
        }
    }
`;

export const GET_RESTAURANTS_QUERY = gql`
    query GetRestaurants {
        restaurants {
            id
            name
            location
            isActive
            createdAt
            updatedAt
        }
    }
`;
