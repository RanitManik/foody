# Foody - Food Ordering Application

A comprehensive full-stack food ordering application implementing role-based access control (RBAC) with restaurant-based restrictions, designed as a solution for a take-home assignment.

<details>
<summary><strong>Table of Contents</strong> (Click to Expand)</summary>

- [**Problem Statement**](#problem-statement)
- [**Solution Overview**](#solution-overview)
- [**Features**](#features)
    - [Core Functionality](#core-functionality)
    - [Access Control & Security](#access-control--security)
    - [Technical Features](#technical-features)
- [**Tech Stack**](#tech-stack)
    - [Frontend](#frontend)
    - [Backend](#backend)
    - [Database & Infrastructure](#database--infrastructure)
    - [DevOps & Monitoring](#devops--monitoring)
- [**Architecture**](#architecture)
    - [Data Model](#data-model)
    - [Access Control Matrix](#access-control-matrix)
- [**Getting Started**](#getting-started)
    - [Prerequisites](#prerequisites)
    - [Installation](#installation)
- [**Development**](#development)
    - [Available Scripts](#available-scripts)
    - [Project Structure](#project-structure)
    - [Code Quality](#code-quality)
- [**Testing**](#testing)
- [**Deployment**](#deployment)
    - [Docker](#docker)
    - [Environment Variables](#environment-variables)
- [**Monitoring & Observability**](#monitoring--observability)
    - [Metrics](#metrics)
    - [Health Checks](#health-checks)
    - [Logging](#logging)
- [**Security**](#security)
- [**Performance**](#performance)
- [**Contributing**](#contributing)
- [**License**](#license)
- [**Acknowledgments**](#acknowledgments)

</details>

## Problem Statement

Nick Fury is a business owner (Admin) with 5 employees:

- Captain Marvel: Manager-India
- Captain America: Manager-America
- Thanos: Team Member-India
- Thor: Team Member-India
- Travis: Team Member-America

Nick wants a web-based food ordering application where users can:

- View restaurants and menu items
- Create an order and add food items
- Checkout cart and pay using existing payment methods
- Cancel orders
- Modify payment methods

Access specifications by role:
| Function | Admin | Manager | Member |
|----------|-------|---------|--------|
| View restaurants & menu items | ✅ | ✅ | ✅ |
| Create order (add food items) | ✅ | ✅ | ✅ |
| Place order (checkout & pay) | ✅ | ✅ | ❌ |
| Cancel order | ✅ | ✅ | ❌ |
| Update payment method | ✅ | ❌ | ❌ |

**Bonus Objective**: Implement relational access where Managers & Members can only access data and features limited to their country (India/America).

## Solution Overview

Foody is a production-ready food ordering platform built with modern web technologies. It implements comprehensive RBAC with granular permissions and restaurant-based data isolation. The application features a GraphQL API backend with real-time subscriptions, a Next.js frontend, and PostgreSQL database with Prisma ORM.

Key achievements:

- ✅ Full-stack web application with all required functionality
- ✅ Role-based access control (ADMIN, MANAGER, MEMBER)
- ✅ Restaurant-based restrictions for managers and members
- ✅ Country-level data isolation (India/America)
- ✅ Secure authentication and authorization
- ✅ Payment processing integration
- ✅ Real-time order updates
- ✅ Comprehensive testing and monitoring

## Features

### Core Functionality

- **Restaurant Management**: View restaurants by location with menu items and categories
- **Menu Browsing**: Browse available menu items with pricing and availability status
- **Order Management**: Create orders, add items, checkout, and track status
- **Payment Processing**: Secure payment method management and order payments
- **Feedback System**: Submit and manage user feedback and reviews
- **Order Lifecycle**: Complete order workflow from pending to delivered

### Access Control & Security

- **Role-Based Access Control**: Three-tier permission system (Admin/Manager/Member)
- **Restaurant-Based Restrictions**: Users scoped to specific restaurants/locations
- **Country-Level Isolation**: Managers and members limited to their assigned country
- **JWT Authentication**: Secure token-based authentication
- **Input Validation**: Comprehensive data validation and sanitization

### Technical Features

- **GraphQL API**: Type-safe API with Apollo Server
- **Real-Time Updates**: WebSocket subscriptions for order status changes
- **Caching**: Redis-based performance optimization
- **Monitoring**: Prometheus metrics and health checks
- **Logging**: Structured logging with Winston
- **Database**: PostgreSQL with Prisma ORM and migrations

## Tech Stack

### Frontend

- **Next.js 15**: React framework with App Router
- **TypeScript**: Type-safe JavaScript
- **Tailwind CSS**: Utility-first CSS framework
- **Apollo Client**: GraphQL client for API communication

### Backend

- **Node.js**: JavaScript runtime
- **Express**: Web framework
- **Apollo Server**: GraphQL server implementation
- **TypeScript**: Type-safe backend development
- **Prisma**: Database ORM and migration tool

### Database & Infrastructure

- **PostgreSQL**: Primary database
- **Redis**: Caching and session storage
- **Docker**: Containerization
- **Jest**: Unit and integration testing
- **Playwright**: End-to-end testing

### DevOps & Monitoring

- **Prometheus**: Metrics collection
- **Winston**: Structured logging
- **Helmet**: Security headers
- **CORS**: Cross-origin resource sharing
- **Rate Limiting**: Request throttling

## Architecture

```
foody/
├── api/                          # Backend API (Express + Apollo Server + GraphQL)
│   ├── src/
│   │   ├── graphql/              # GraphQL schema and resolvers
│   │   │   ├── auth/             # Authentication & user management
│   │   │   ├── feedback/         # User feedback submissions
│   │   │   ├── menu/             # Menu item management
│   │   │   ├── order/             # Order processing
│   │   │   ├── payment/          # Payment processing
│   │   │   ├── restaurant/       # Restaurant management
│   │   │   └── user/             # User profile management
│   │   ├── lib/                  # Shared utilities and services
│   │   ├── middleware/           # Express middleware
│   │   ├── metrics/              # Monitoring and metrics
│   │   └── main.ts               # Application entry point
│   ├── prisma/                   # Database schema and migrations
│   └── package.json
├── web/                          # Frontend (Next.js)
│   ├── src/
│   │   ├── app/                  # Next.js app router
│   │   └── components/           # React components
│   └── package.json
├── api-e2e/                      # API end-to-end tests
└── web-e2e/                      # Web end-to-end tests
```

### Data Model

- **Users**: Role-based accounts with restaurant assignments
- **Restaurants**: Location-based establishments with menu items
- **Menu Items**: Food items with pricing and availability
- **Orders**: Customer orders with status tracking
- **Payments**: Payment transactions and methods
- **Feedback**: User feedback submissions and reviews

### Access Control Matrix

| Category                    | Operation                   | ADMIN | MANAGER | MEMBER |
| --------------------------- | --------------------------- | ----- | ------- | ------ |
| **Data Access Permissions** |                             |       |         |        |
|                             | View All Restaurants        | ✅    | ❌      | ❌     |
|                             | View Restaurants by Country | ❌    | ✅      | ❌     |
|                             | View Assigned Restaurant    | ❌    | ❌      | ✅     |
|                             | View All Menu Items         | ✅    | ❌      | ❌     |
|                             | View Menu Items by Country  | ❌    | ✅      | ❌     |
|                             | View Assigned Menu Items    | ❌    | ❌      | ✅     |
|                             | View All Users              | ✅    | ❌      | ❌     |
|                             | View All Feedback           | ✅    | ❌      | ❌     |
| **Restaurant Management**   |                             |       |         |        |
|                             | Create Restaurants          | ✅    | ❌      | ❌     |
|                             | Update Restaurants          | ✅    | ❌      | ❌     |
|                             | Delete Restaurants          | ✅    | ❌      | ❌     |
| **Menu Management**         |                             |       |         |        |
|                             | Create Menu Items           | ✅    | ✅      | ❌     |
|                             | Update Menu Items           | ✅    | ✅      | ❌     |
|                             | Delete Menu Items           | ✅    | ✅      | ❌     |
| **Order Management**        |                             |       |         |        |
|                             | Create Orders               | ✅    | ✅      | ✅     |
|                             | Checkout/Pay Orders         | ✅    | ✅      | ❌     |
|                             | Cancel Orders               | ✅    | ✅      | ❌     |
|                             | Update Order Status         | ✅    | ✅      | ❌     |
| **Payment Management**      |                             |       |         |        |
|                             | View Payment Methods        | ✅    | ✅      | ✅     |
|                             | Create Payment Methods      | ✅    | ✅      | ✅     |
|                             | Update Payment Methods      | ✅    | ❌      | ❌     |
|                             | Delete Payment Methods      | ✅    | ❌      | ❌     |
|                             | Process Payments            | ✅    | ✅      | ❌     |
| **User Management**         |                             |       |         |        |
|                             | Create Users                | ✅    | ❌      | ❌     |
|                             | Update Users                | ✅    | ❌      | ❌     |
|                             | Delete Users                | ✅    | ❌      | ❌     |
| **Feedback Management**     |                             |       |         |        |
|                             | Submit Feedback             | ✅    | ✅      | ✅     |
| **Authentication**          |                             |       |         |        |
|                             | Register Users              | ✅    | ❌      | ❌     |
|                             | Login                       | ✅    | ✅      | ✅     |

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 15+
- Redis (optional, for caching)

### Installation

1. **Clone the repository:**

    ```bash
    git clone <repository-url>
    cd foody
    ```

2. **Install dependencies:**

    ```bash
    npm install
    ```

3. **Set up environment variables:**

    ```bash
    cp api/.env.example api/.env
    cp web/.env.example web/.env
    ```

4. **Set up the database:**

    ```bash
    npm run db:setup
    ```

5. **Start development servers:**

    ```bash
    # API server (http://localhost:4000)
    npm run dev:api

    # Web application (http://localhost:3000)
    npm run dev:web
    ```

    > [!NOTE]
    > You can also use `npm run dev` to start both servers.

## Development

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
npm run test:api          # Run API unit tests
npm run test:web          # Run web tests
npm run test:e2e          # Run end-to-end tests

# Building
npm run build             # Build all projects
npm run build:api         # Build API
npm run build:web         # Build web application
```

### Project Structure

- **API (`api/`)**: GraphQL backend with domain-driven structure
- **Web (`web/`)**: Next.js frontend application
- **Tests**: Comprehensive testing across unit, integration, and e2e
- **Infrastructure**: Docker configuration and CI/CD pipelines

### Code Quality

- **Linting**: ESLint configuration for consistent code style
- **Type Checking**: TypeScript strict mode enabled
- **Testing**: Jest for unit tests, Playwright for e2e tests
- **Pre-commit Hooks**: Automated code quality checks

## Testing

The application includes comprehensive testing coverage:

- **Unit Tests**: Component and utility testing with Jest
- **Integration Tests**: API endpoint testing
- **E2E Tests**: Full user journey testing with Playwright
- **Performance Tests**: Load testing capabilities

Run tests:

```bash
npm run test              # All tests
npm run test:api          # API unit tests
npm run test:e2e          # End-to-end tests
```

## Deployment

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
```

## Monitoring & Observability

### Metrics

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

Structured logging with Winston for request/response tracking, error monitoring, and performance analysis.

## Security

- **Authentication**: JWT-based secure authentication
- **Authorization**: Granular role-based permissions
- **Input Validation**: Zod schema validation
- **Rate Limiting**: Express rate limiting middleware
- **Security Headers**: Helmet.js protection
- **CORS**: Configured cross-origin policies
- **SQL Injection Protection**: Prisma ORM safeguards
- **XSS Protection**: Input sanitization

## Performance

- **Caching**: Redis-based caching for frequently accessed data
- **Database Optimization**: Indexed queries and connection pooling
- **Response Compression**: Gzip compression
- **Query Optimization**: Selective field fetching in GraphQL
- **Connection Limits**: Configured database connection pools

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add tests for new features
5. Ensure all tests pass (`npm run test`)
6. Commit your changes (`git commit -m 'Add amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

This application was developed as a solution to a take-home assignment, demonstrating full-stack development skills with modern web technologies and comprehensive access control implementation.
