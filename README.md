# Foody - Food Ordering Application

A full-stack food ordering application with role-based access control (RBAC) and restaurant-based restrictions. Built with Next.js, NestJS, GraphQL, and Prisma.

## Features

- **Role-based Access Control**: Admin, Manager, Member
- **Restaurant-based Restrictions**: Users can only access data for their assigned restaurant
- **GraphQL API**: Type-safe API with Apollo Server
- **Real-time Subscriptions**: WebSocket support for real-time updates
- **Security**: Helmet, CORS, rate limiting, input validation
- **Caching**: Redis-based caching for performance
- **Monitoring**: Prometheus metrics and health checks
- **Database**: PostgreSQL with Prisma ORM

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express, Apollo Server, GraphQL
- **Database**: PostgreSQL, Prisma ORM
- **Cache**: Redis
- **Testing**: Jest, Playwright
- **Monitoring**: Prometheus, Winston logging
- **Deployment**: Docker, Kubernetes ready

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 15+
- Redis (optional, for caching)
- Docker & Docker Compose (for local development)

### Installation

1. Clone the repository:

    ```bash
    git clone <repository-url>
    cd foody
    ```

2. Install dependencies:

    ```bash
    npm install
    ```

3. Set up environment variables:

    ```bash
    cp api/.env.example api/.env
    cp web/.env.example web/.env
    ```

4. Start PostgreSQL and Redis:

    ```bash
    # Using Docker Compose
    docker-compose up -d postgres redis
    ```

5. Set up the database:

    ```bash
    npm run db:setup
    ```

6. Start the development servers:

    ```bash
    # API server
    npm run dev:api

    # Web application
    npm run dev:web
    ```

## API Documentation

### GraphQL Endpoint

The GraphQL API is available at `http://localhost:4000/graphql`

### Health Checks

- **Basic Health**: `GET /health`
- **Detailed Health**: `GET /health/detailed`
- **Readiness**: `GET /health/ready`
- **Metrics**: `GET /health/metrics` (Prometheus format)

### Authentication

The API uses JWT tokens for authentication. Include the token in the `Authorization` header:

```
Authorization: Bearer <your-jwt-token>
```

### Core Entities

#### Users

- **Roles**: ADMIN, MANAGER, MEMBER
- **Restaurant-based access**: Users can only view data for their assigned restaurant (admin has global access)
- **Assigned Restaurants**: Managers and members include a `restaurantId` (for example `restaurant-india-1`)

#### Restaurants

- **Location-specific**: Each restaurant is tied to a unique `location` slug (for example `burger-haven-new-york`)
- **Menu management**: Each restaurant has multiple menu items

#### Menu Items

- **Availability**: Items can be marked as available/unavailable
- **Categories**: Items are organized by categories
- **Pricing**: Flexible pricing structure

#### Orders

- **Status tracking**: PENDING → CONFIRMED → PREPARING → READY → DELIVERED
- **Payment integration**: Stripe/PayPal support
- **Real-time updates**: Order status changes via subscriptions

### Sample Queries

#### Get Restaurants

```graphql
query GetRestaurants($location: String) {
    restaurants(location: $location, first: 10) {
        id
        name
        address
        city
        location
        menu_items(where: { isAvailable: true }) {
            id
            name
            price
            category
        }
    }
}
```

#### Get Menu Items

```graphql
query GetMenuItems($restaurantId: String) {
    menuItems(restaurantId: $restaurantId, first: 20) {
        id
        name
        description
        price
        category
        isAvailable
        restaurants {
            id
            name
            address
        }
    }
}
```

#### Create Order

```graphql
mutation CreateOrder($input: CreateOrderInput!) {
    createOrder(input: $input) {
        id
        totalAmount
        status
        deliveryAddress
        order_items {
            id
            quantity
            price
            menu_items {
                name
            }
        }
    }
}
```

## Development

### Project Structure

```
foody/
├── api/                    # Backend API (NestJS + GraphQL)
│   ├── src/
│   │   ├── graphql/        # GraphQL schema and resolvers
│   │   ├── lib/           # Shared utilities
│   │   ├── middleware/    # Express middleware
│   │   ├── metrics/       # Monitoring and metrics
│   │   └── main.ts        # Application entry point
│   ├── prisma/            # Database schema and migrations
│   └── package.json
├── web/                    # Frontend (Next.js)
│   ├── src/
│   │   ├── app/           # Next.js app router
│   │   └── components/    # React components
│   └── package.json
├── api-e2e/               # API end-to-end tests
└── web-e2e/               # Web end-to-end tests
```

### Available Scripts

```bash
# Development
npm run dev:api           # Start API server
npm run dev:web           # Start web application
npm run dev               # Start both servers

# Database
npm run db:generate       # Generate Prisma client
npm run db:migrate        # Run database migrations
npm run db:reset          # Reset database
npm run db:seed           # Seed database with test data
npm run db:setup          # Complete database setup

# Testing
npm run test              # Run all tests
npm run test:api          # Run API tests
npm run test:web          # Run web tests
npm run test:e2e          # Run end-to-end tests

# Building
npm run build             # Build all projects
npm run build:api         # Build API
npm run build:web         # Build web application
```

### Testing

The application includes comprehensive testing:

- **Unit Tests**: Jest for component and utility testing
- **Integration Tests**: API endpoint testing
- **E2E Tests**: Playwright for full user journey testing
- **Performance Tests**: Load testing with Artillery

Run tests:

```bash
npm run test              # All tests
npm run test:api          # API unit tests
npm run test:e2e          # End-to-end tests
```

## Deployment

### Docker

Build and run with Docker:

```bash
# Build images
docker build -t foody-api ./api
docker build -t foody-web ./web

# Run with docker-compose
docker-compose up -d
```

### Environment Variables

#### API (.env)

```env
DATABASE_URL="postgresql://user:password@localhost:5432/foody"
JWT_SECRET="your-jwt-secret"
REDIS_URL="redis://localhost:6379"
NODE_ENV="production"
HOST="0.0.0.0"
PORT=4000
```

#### Web (.env.local)

```env
NEXT_PUBLIC_API_URL="http://localhost:4000/graphql"
NEXT_PUBLIC_WS_URL="ws://localhost:4000/graphql"
```

## Monitoring

### Metrics

The application exposes Prometheus metrics at `/health/metrics`:

- HTTP request duration and count
- GraphQL query metrics
- Cache hit/miss ratios
- Database connection pool status
- Application error rates

### Health Checks

- **Health Check**: Basic service availability
- **Readiness Check**: Database connectivity
- **Detailed Health**: Comprehensive system status

### Logging

Structured logging with Winston:

- Request/response logging
- Error tracking
- Performance monitoring
- Security events

## Security

- **Authentication**: JWT-based authentication
- **Authorization**: Role-based access control
- **Input Validation**: Zod schema validation
- **Rate Limiting**: Express rate limiting
- **Security Headers**: Helmet.js
- **CORS**: Configured CORS policies
- **SQL Injection Protection**: Prisma ORM
- **XSS Protection**: Input sanitization

## Performance

- **Caching**: Redis-based caching for frequently accessed data
- **Database Optimization**: Indexed queries and connection pooling
- **Response Compression**: Gzip compression
- **Query Optimization**: Selective field fetching
- **Connection Limits**: Configured database connection pools

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new features
5. Ensure all tests pass
6. Submit a pull request

## License

MIT License - see LICENSE file for details
