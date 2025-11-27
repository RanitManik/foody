# Foody API Documentation

## Overview

The Foody API is a GraphQL-based backend service that provides comprehensive restaurant operations management functionality. It implements role-based access control with restaurant-based data isolation.

## Base URL

```
http://localhost:4000/graphql
```

## Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the `Authorization` header:

```
Authorization: Bearer <your-jwt-token>
```

## GraphQL Schema

The API follows a domain-driven design with the following main areas:

### Core Domains

- **Auth** - User authentication and authorization
- **User** - User management and profile operations
- **Restaurant** - Restaurant location management
- **Menu** - Menu item and category management
- **Order** - Order creation and lifecycle management
- **Payment** - Payment processing and method management
- **Feedback** - Customer feedback collection

### Data Types

#### User Roles

- `ADMIN` - Full system access
- `MANAGER` - Restaurant-specific management access
- `MEMBER` - Restaurant-specific operational access

#### Order Status

- `PENDING` - Order created, awaiting processing
- `COMPLETED` - Order fulfilled successfully
- `CANCELLED` - Order cancelled

#### Payment Status

- `PENDING` - Payment initiated
- `PROCESSING` - Payment being processed
- `COMPLETED` - Payment successful
- `FAILED` - Payment failed
- `REFUNDED` - Payment refunded

## Rate Limiting

The API implements rate limiting to prevent abuse:

- **Authenticated requests**: 1000 requests per hour
- **Unauthenticated requests**: 100 requests per hour
- **GraphQL complexity**: Maximum complexity score of 2000

## Error Handling

The API returns standardized error responses with the following structure:

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

## Health Checks

- **Health**: `GET /health` - Basic service health
- **Readiness**: `GET /health/ready` - Database connectivity check
- **Metrics**: `GET /metrics` - Prometheus metrics endpoint

## Real-time Updates

The API supports GraphQL subscriptions for real-time updates:

- Order status changes
- New order notifications
- Payment status updates

WebSocket endpoint: `ws://localhost:4000/graphql`

## Development

### Local Development

1. Start the API server:

    ```bash
    npm run dev:api
    ```

2. Access GraphQL Playground at `http://localhost:4000/graphql`

### Testing

Run API tests:

```bash
npm run test:api
```

Run E2E tests:

```bash
npm run e2e:api
```

## Schema Documentation

For detailed schema documentation, see the individual domain files in `api/src/graphql/` or use the GraphQL Playground's documentation explorer.
