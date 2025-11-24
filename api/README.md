# Foody API Documentation

This document provides comprehensive documentation for the Foody GraphQL API, including authentication, core entities, queries, mutations, and access control rules.

<details>
<summary><strong>Table of Contents</strong> (Click to Expand)</summary>

- [**GraphQL Endpoint**](#graphql-endpoint)
    - [GraphQL Playground](#graphql-playground)
        - [Authentication in GraphQL Playground](#authentication-in-graphql-playground)
- [**Postman Collection**](#postman-collection)
    - [Collection Details](#collection-details)
    - [Using the Postman Collection](#using-the-postman-collection)
    - [Automated Testing Collection](#automated-testing-collection)
    - [Public Workspace](#public-workspace)
- [**Authentication**](#authentication)
    - [Authentication Header Format](#authentication-header-format)
    - [Obtaining a Token](#obtaining-a-token)
    - [Token Expiration](#token-expiration)
    - [Using Tokens in API Clients](#using-tokens-in-api-clients)
        - [Postman Collection](#postman-collection-1)
        - [Other API Clients](#other-api-clients)
- [**Access Control**](#access-control)
    - [User Roles](#user-roles)
    - [Access Control Matrix](#access-control-matrix)
    - [Restaurant-Based Restrictions](#restaurant-based-restrictions)
- [**Core Entities**](#core-entities)
    - [User](#user)
    - [Restaurant](#restaurant)
    - [MenuItem](#menuitem)
    - [Order](#order)
    - [Payment](#payment)
    - [Feedback](#feedback)
- [**Queries**](#queries)
    - [Authentication Queries](#authentication-queries)
        - [Get Current User](#get-current-user)
    - [Restaurant Queries](#restaurant-queries)
        - [Get Restaurants](#get-restaurants)
        - [Get Single Restaurant](#get-single-restaurant)
    - [Menu Queries](#menu-queries)
        - [Get Menu Items](#get-menu-items)
        - [Get Menu Categories](#get-menu-categories)
    - [Order Queries](#order-queries)
        - [Get Orders](#get-orders)
        - [Get Single Order](#get-single-order)
    - [Payment Queries](#payment-queries)
        - [Get Payment Methods](#get-payment-methods)
    - [Feedback Queries](#feedback-queries)
        - [Get Feedback](#get-feedback)
- [**Mutations**](#mutations)
    - [Authentication Mutations](#authentication-mutations)
        - [Register User](#register-user)
        - [Login](#login)
    - [Order Mutations](#order-mutations)
        - [Create Order](#create-order)
        - [Update Order Status](#update-order-status)
        - [Cancel Order](#cancel-order)
    - [Menu Management Mutations](#menu-management-mutations)
        - [Create Menu Item](#create-menu-item)
        - [Update Menu Item](#update-menu-item)
        - [Delete Menu Item](#delete-menu-item)
    - [Payment Mutations](#payment-mutations)
        - [Create Payment Method](#create-payment-method)
        - [Update Payment Method](#update-payment-method)
        - [Process Payment](#process-payment)
    - [Restaurant Management Mutations](#restaurant-management-mutations)
        - [Create Restaurant](#create-restaurant)
        - [Update Restaurant](#update-restaurant)
    - [User Management Mutations](#user-management-mutations)
        - [Update User](#update-user)
    - [Feedback Mutations](#feedback-mutations)
        - [Create Feedback](#create-feedback)
- [**Health Checks**](#health-checks)
- [**Error Handling**](#error-handling)
    - [Common Error Codes](#common-error-codes)
- [**Rate Limiting**](#rate-limiting)
- [**Data Types**](#data-types)
    - [Enums](#enums)
        - [UserRole](#userrole)
        - [OrderStatus](#orderstatus)
        - [PaymentStatus](#paymentstatus)
        - [PaymentType](#paymenttype)
        - [PaymentProvider](#paymentprovider)
    - [Scalars](#scalars)
- [**Testing**](#testing)
    - [Postman Collection](#postman-collection-2)
    - [Automated Tests](#automated-tests)
- [**Development**](#development)
    - [Local Development](#local-development)
    - [Environment Variables](#environment-variables)
    - [Database](#database)
- [**Support**](#support)

</details>

## GraphQL EndpointThe GraphQL API is available at `http://localhost:4000/graphql`

### GraphQL Playground

When running in development mode, you can access the GraphQL Playground at `http://localhost:4000/graphql` for interactive API exploration.

#### Authentication in GraphQL Playground

To authenticate requests in the GraphQL Playground:

1. Obtain a JWT token using the `login` mutation
2. Click the **Headers** tab at the bottom of the playground
3. Add an Authorization header from the shared headers section:

```json
{
    "Authorization": "YOUR_JWT_TOKEN_HERE"
}
```

All subsequent requests in the playground session will include this header automatically.

## Postman Collection

A comprehensive Postman collection is available for testing the API endpoints. The collection includes pre-configured requests for all operations with proper authentication setup.

> [!TIP]
> For the best API testing experience, use the Postman collections available in the [`api/postman/`](../api/postman/) folder. All manual and automated testing collections are included with proper authentication setup.

[<img src="https://run.pstmn.io/button.svg" alt="Run In Postman" style="width: 128px; height: 32px;">](https://app.getpostman.com/run-collection/34405309-0afb9e87-875a-422e-bc36-e55d91cab11e?action=collection%2Ffork&source=rip_markdown&collection-url=entityId%3D34405309-0afb9e87-875a-422e-bc36-e55d91cab11e%26entityType%3Dcollection%26workspaceId%3D43b3b3eb-c390-468d-8c66-8c2ecbe23736)

### Collection Details

- **Collection File**: `api/postman/Foody_API_Postman_Collection.json`
- **Environment File**: `api/postman/Foody_API.postman_environment.json`
- **Automated Tests**: `api/postman/Foody_API_Postman_Automated.json`
- **Public Workspace Link**: `https://www.postman.com/foody0-8157/workspace/foody`

### Using the Postman Collection

1. **Import the Collection**:
    - Open Postman
    - Click "Import" and select `api/postman/Foody_API_Postman_Collection.json`

2. **Import the Environment**:
    - Click "Import" and select `api/postman/Foody_API.postman_environment.json`
    - Select the "Foody API" environment

3. **Set Authentication Token**:
    - The collection uses a shared variable `{{auth_token}}` for authorization
    - After logging in via the "Login" request, the token is automatically stored in the environment variable
    - All subsequent requests will use this token in the Authorization header

4. **Environment Variables**:
    - `base_url`: API base URL (default: `http://localhost:4000`)
    - `auth_token`: JWT token (automatically set after login)
    - `graphql_endpoint`: GraphQL endpoint (default: `{{base_url}}/graphql`)

### Automated Testing Collection

The automated collection (`Foody_API_Postman_Automated.json`) includes:

- Pre-configured test scripts
- Automated token refresh
- Response validation
- Integration tests for common workflows

### Public Workspace

You can also access the collection directly from the public Postman workspace:

- **Workspace ID**: `43b3b3eb-c390-468d-8c66-8c2ecbe23736`
- Visit: `https://www.postman.com/restless-shadow-123456/workspace/foody-api/overview`

## Authentication

The API uses JWT (JSON Web Token) based authentication. All protected operations require a valid JWT token in the `Authorization` header.

### Authentication Header Format

```
Authorization: Bearer <your-jwt-token>
```

### Obtaining a Token

Use the `login` mutation to authenticate and receive a JWT token:

```graphql
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
```

### Token Expiration

JWT tokens expire after 24 hours. Use the refresh mechanism or re-authenticate when tokens expire.

### Using Tokens in API Clients

#### Postman Collection

The included Postman collection automatically manages authentication:

- Login request stores the token in the `{{auth_token}}` environment variable
- All subsequent requests use this shared variable in the Authorization header
- No manual token management required

#### Other API Clients

When using tools like curl, Insomnia, or custom scripts:

1. Extract the `token` field from the login response
2. Include it in the Authorization header for all subsequent requests
3. Handle token expiration by implementing refresh logic or re-authentication

## Access Control

The API implements role-based access control (RBAC) with restaurant-based restrictions:

### User Roles

- **ADMIN**: Full system access, can manage all restaurants and users
- **MANAGER**: Access limited to restaurants in their assigned country, can manage orders and menu items
- **MEMBER**: Access limited to their assigned restaurant, basic ordering capabilities

### Access Control Matrix

| Operation              | ADMIN | MANAGER | MEMBER   |
| ---------------------- | ----- | ------- | -------- |
| View Restaurants       | All   | Country | Assigned |
| View Menu Items        | All   | Country | Assigned |
| Create Orders          | ✅    | ✅      | ✅       |
| Checkout/Pay Orders    | ✅    | ✅      | ❌       |
| Cancel Orders          | ✅    | ✅      | ❌       |
| Update Payment Methods | ✅    | ❌      | ❌       |
| Submit Feedback        | ✅    | ✅      | ✅       |
| View Feedback          | ✅    | ❌      | ❌       |
| Manage Restaurants     | ✅    | ❌      | ❌       |
| Manage Users           | ✅    | ❌      | ❌       |

### Restaurant-Based Restrictions

- **Managers**: Can only access restaurants and data for their assigned country's locations
- **Members**: Can only access their assigned restaurant and related data
- **Admins**: Have unrestricted access to all data

## Core Entities

### User

Represents a system user with role-based permissions.

```graphql
type User {
    id: ID!
    email: String!
    firstName: String!
    lastName: String!
    role: UserRole!
    restaurantId: ID
    isActive: Boolean!
    createdAt: DateTime!
    updatedAt: DateTime!
}
```

### Restaurant

Represents a physical restaurant location with menu offerings.

```graphql
type Restaurant {
    id: ID!
    name: String!
    description: String
    address: String!
    city: String!
    location: String!
    phone: String
    email: String
    isActive: Boolean!
    menuItems: [MenuItem!]!
    menuCategories: [String!]!
    createdAt: DateTime!
    updatedAt: DateTime!
}
```

### MenuItem

Represents a food item available at a restaurant.

```graphql
type MenuItem {
    id: ID!
    name: String!
    description: String
    price: Decimal!
    imageUrl: String
    isAvailable: Boolean!
    category: String
    restaurant: Restaurant!
    createdAt: DateTime!
    updatedAt: DateTime!
}
```

### Order

Represents a customer order with items and status tracking.

```graphql
type Order {
    id: ID!
    status: OrderStatus!
    totalAmount: Decimal!
    phone: String!
    specialInstructions: String
    user: User!
    items: [OrderItem!]!
    payment: Payment
    createdAt: DateTime!
    updatedAt: DateTime!
}
```

### Payment

Represents a payment transaction for an order.

```graphql
type Payment {
    id: ID!
    amount: Decimal!
    status: PaymentStatus!
    method: PaymentMethod!
    order: Order!
    transactionId: String
    createdAt: DateTime!
    updatedAt: DateTime!
}
```

### Feedback

Represents user feedback submissions.

```graphql
type Feedback {
    id: ID!
    userId: ID
    email: String
    message: String!
    createdAt: DateTime!
}
```

## Queries

### Authentication Queries

#### Get Current User

```graphql
query Me {
    me {
        id
        email
        firstName
        lastName
        role
        restaurantId
    }
}
```

### Restaurant Queries

#### Get Restaurants

```graphql
query GetRestaurants($location: String, $first: Int, $skip: Int) {
    restaurants(location: $location, first: $first, skip: $skip) {
        id
        name
        description
        address
        city
        location
        menuItems {
            id
            name
            price
            category
            isAvailable
        }
    }
}
```

#### Get Single Restaurant

```graphql
query GetRestaurant($id: ID!) {
    restaurant(id: $id) {
        id
        name
        address
        city
        location
        menuItems {
            id
            name
            description
            price
            category
            isAvailable
        }
    }
}
```

### Menu Queries

#### Get Menu Items

```graphql
query GetMenuItems($restaurantId: ID, $first: Int, $skip: Int) {
    menuItems(restaurantId: $restaurantId, first: $first, skip: $skip) {
        id
        name
        description
        price
        category
        isAvailable
        restaurant {
            id
            name
            location
        }
    }
}
```

#### Get Single Menu Item

```graphql
query GetMenuItem($id: ID!) {
    menuItem(id: $id) {
        id
        name
        description
        price
        category
        isAvailable
        restaurant {
            id
            name
            location
        }
    }
}
```

#### Get Menu Categories

```graphql
query GetMenuCategories($restaurantId: ID) {
    menuCategories(restaurantId: $restaurantId)
}
```

### Order Queries

#### Get Orders

```graphql
query GetOrders($first: Int, $skip: Int) {
    orders(first: $first, skip: $skip) {
        id
        status
        totalAmount
        phone
        createdAt
        items {
            id
            quantity
            price
            menuItem {
                name
                category
            }
        }
    }
}
```

#### Get Single Order

```graphql
query GetOrder($id: ID!) {
    order(id: $id) {
        id
        status
        totalAmount
        phone
        specialInstructions
        items {
            id
            quantity
            price
            notes
            menuItem {
                name
                description
                price
            }
        }
        payment {
            id
            amount
            status
            transactionId
        }
    }
}
```

### Payment Queries

#### Get Payment Methods

```graphql
query GetPaymentMethods {
    paymentMethods {
        id
        type
        provider
        last4
        isDefault
        createdAt
    }
}
```

### Feedback Queries

#### Get Feedback

```graphql
query GetFeedback($first: Int, $skip: Int) {
    feedbacks(first: $first, skip: $skip) {
        id
        userId
        email
        message
        createdAt
    }
}
```

## Mutations

### Authentication Mutations

#### Register User

```graphql
mutation Register($input: RegisterInput!) {
    register(input: $input) {
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
```

#### Login

```graphql
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
```

### Order Mutations

#### Create Order

```graphql
mutation CreateOrder($input: CreateOrderInput!) {
    createOrder(input: $input) {
        id
        totalAmount
        status
        phone
        items {
            id
            quantity
            price
            menuItem {
                name
                category
            }
        }
    }
}
```

#### Update Order Status

```graphql
mutation UpdateOrderStatus($id: ID!, $status: OrderStatus!) {
    updateOrderStatus(id: $id, status: $status) {
        id
        status
        updatedAt
    }
}
```

#### Cancel Order

```graphql
mutation CancelOrder($id: ID!) {
    cancelOrder(id: $id) {
        id
        status
        updatedAt
    }
}
```

### Menu Management Mutations

#### Create Menu Item

```graphql
mutation CreateMenuItem($input: CreateMenuItemInput!) {
    createMenuItem(input: $input) {
        id
        name
        description
        price
        category
        isAvailable
    }
}
```

#### Update Menu Item

```graphql
mutation UpdateMenuItem($id: ID!, $input: UpdateMenuItemInput!) {
    updateMenuItem(id: $id, input: $input) {
        id
        name
        price
        isAvailable
        updatedAt
    }
}
```

#### Delete Menu Item

```graphql
mutation DeleteMenuItem($id: ID!) {
    deleteMenuItem(id: $id)
}
```

### Payment Mutations

#### Create Payment Method

```graphql
mutation CreatePaymentMethod($input: CreatePaymentMethodInput!) {
    createPaymentMethod(input: $input) {
        id
        type
        provider
        last4
        isDefault
    }
}
```

#### Update Payment Method

```graphql
mutation UpdatePaymentMethod($id: ID!, $input: UpdatePaymentMethodInput!) {
    updatePaymentMethod(id: $id, input: $input) {
        id
        isDefault
        updatedAt
    }
}
```

#### Delete Payment Method

```graphql
mutation DeletePaymentMethod($id: ID!) {
    deletePaymentMethod(id: $id)
}
```

#### Process Payment

```graphql
mutation ProcessPayment($input: ProcessPaymentInput!) {
    processPayment(input: $input) {
        id
        amount
        status
        transactionId
    }
}
```

### Restaurant Management Mutations

#### Create Restaurant

```graphql
mutation CreateRestaurant($input: CreateRestaurantInput!) {
    createRestaurant(input: $input) {
        id
        name
        address
        city
        location
    }
}
```

#### Update Restaurant

```graphql
mutation UpdateRestaurant($id: ID!, $input: UpdateRestaurantInput!) {
    updateRestaurant(id: $id, input: $input) {
        id
        name
        address
        isActive
        updatedAt
    }
}
```

#### Delete Restaurant

```graphql
mutation DeleteRestaurant($id: ID!) {
    deleteRestaurant(id: $id)
}
```

### User Management Mutations

#### Create User

```graphql
mutation CreateUser($input: CreateUserInput!) {
    createUser(input: $input) {
        id
        email
        firstName
        lastName
        role
        restaurantId
    }
}
```

#### Update User

```graphql
mutation UpdateUser($id: ID!, $input: UpdateUserInput!) {
    updateUser(id: $id, input: $input) {
        id
        email
        firstName
        lastName
        role
        updatedAt
    }
}
```

#### Delete User

```graphql
mutation DeleteUser($id: ID!) {
    deleteUser(id: $id)
}
```

### Feedback Mutations

#### Create Feedback

```graphql
mutation CreateFeedback($input: CreateFeedbackInput!) {
    createFeedback(input: $input) {
        id
        userId
        email
        message
        createdAt
    }
}
```

## Health Checks

The API provides several health check endpoints:

- **Basic Health**: `GET /health`
- **Detailed Health**: `GET /health/detailed`
- **Readiness**: `GET /health/ready`
- **Metrics**: `GET /health/metrics` (Prometheus format)

## Error Handling

The API returns standardized error responses:

```json
{
    "errors": [
        {
            "message": "Error description",
            "extensions": {
                "code": "ERROR_CODE",
                "details": {}
            }
        }
    ]
}
```

### Common Error Codes

- `UNAUTHENTICATED`: Missing or invalid authentication
- `FORBIDDEN`: Insufficient permissions for operation
- `NOT_FOUND`: Requested resource not found
- `VALIDATION_ERROR`: Invalid input data
- `INTERNAL_SERVER_ERROR`: Server-side error

## Rate Limiting

The API implements rate limiting to prevent abuse:

- **Authenticated requests**: 1000 requests per hour
- **Unauthenticated requests**: 100 requests per hour
- **GraphQL complexity**: Limited query complexity

## Data Types

### Enums

#### UserRole

```graphql
enum UserRole {
    ADMIN
    MANAGER
    MEMBER
}
```

#### OrderStatus

```graphql
enum OrderStatus {
    PENDING
    CONFIRMED
    PREPARING
    READY
    DELIVERED
    CANCELLED
}
```

#### PaymentStatus

```graphql
enum PaymentStatus {
    PENDING
    PROCESSING
    COMPLETED
    FAILED
    REFUNDED
}
```

#### PaymentType

```graphql
enum PaymentType {
    CREDIT_CARD
    DEBIT_CARD
    PAYPAL
    APPLE_PAY
    GOOGLE_PAY
}
```

#### PaymentProvider

```graphql
enum PaymentProvider {
    STRIPE
    PAYPAL
    SQUARE
}
```

### Scalars

- `ID`: Unique identifier (String)
- `String`: Text data
- `Int`: Integer numbers
- `Float`: Floating-point numbers
- `Boolean`: True/false values
- `DateTime`: ISO 8601 date-time string
- `Decimal`: High-precision decimal numbers

## Testing

### Postman Collection

A comprehensive Postman collection is available at `api/postman/Foody_API_Postman_Collection.json` with pre-configured requests for all API endpoints.

### Automated Tests

Run API tests with:

```bash
npm run test:e2e:api
```

## Development

### Local Development

1. Start the API server:

    ```bash
    npm run dev:api
    ```

2. Access GraphQL Playground at `http://localhost:4000/graphql`

3. Use the included Postman collection for testing

### Environment Variables

Required environment variables are documented in `.env.example`. Copy this file to `.env` and configure your local environment.

### Database

The API uses Prisma with PostgreSQL. Database operations:

```bash
npm run db:migrate    # Apply migrations
npm run db:generate   # Generate Prisma client
npm run db:seed       # Seed with test data
```

## Support

For API-related questions or issues, please refer to the main project documentation or create an issue in the repository.
