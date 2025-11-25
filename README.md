 <img width="70" src="logo.png" alt="Foody Logo" />

# Foody - Restaurant Operations Management Platform

A comprehensive restaurant operations management platform implementing role-based access control with restaurant-based restrictions, designed as a solution for restaurant owners and managers to efficiently run their business operations.

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

Nick Fury is a restaurant business owner (Admin) with multiple restaurant locations and employees:

- Captain Marvel: Manager-India (manages Spice Garden restaurant)
- Captain America: Manager-America (manages Burger Haven restaurant)
- Thanos: Team Member-India (works at Spice Garden)
- Thor: Team Member-India (works at Spice Garden)
- Travis: Team Member-America (works at Burger Haven)

Nick needs a web-based restaurant operations platform where staff can:

- Create and manage customer orders (POS-style interface)
- Process payments and update order status
- Manage menu items and pricing
- Handle payment methods
- View restaurant performance data

Access specifications by role:
| Function | Admin | Manager | Member |
|----------|-------|---------|--------|
| Create orders (POS functionality) | ✅ | ✅ | ✅ |
| Process payments & update order status | ✅ | ✅ | ❌ |
| Manage menu items | ✅ | ✅ | ❌ |
| Manage payment methods | ✅ | ❌ | ❌ |
| Manage users & restaurants | ✅ | ❌ | ❌ |

**Bonus Objective**: Implement relational access where Managers & Members can only access data and features limited to their assigned restaurant location.

## Solution Overview

Foody is a production-ready restaurant operations management platform built with modern web technologies. It implements comprehensive RBAC with granular permissions and restaurant-based data isolation. The application features a GraphQL API backend with real-time subscriptions, a Next.js frontend with POS-style interfaces, and PostgreSQL database with Prisma ORM.

Key achievements:

- ✅ Full-stack restaurant operations platform with all required functionality
- ✅ Role-based access control (ADMIN, MANAGER, MEMBER) with restaurant scoping
- ✅ Restaurant-based restrictions for managers and members
- ✅ Restaurant-level data isolation and access control
- ✅ POS-style order creation and management interface
- ✅ Payment processing and order lifecycle management
- ✅ Menu management and inventory control
- ✅ Multi-location restaurant management
- ✅ Real-time order status updates
- ✅ Comprehensive testing and monitoring

## Features

### Core Functionality

- **Restaurant Management**: Create and manage multiple restaurant locations with detailed information
- **Order Management**: POS-style order creation, status tracking, and lifecycle management
- **Menu Management**: Create, update, and manage menu items with categories and pricing
- **Payment Processing**: Secure payment method management and order payment processing
- **User Management**: Role-based user accounts with restaurant assignments
- **Feedback System**: Collect and manage customer feedback and reviews
- **Order Lifecycle**: Complete order workflow from creation to completion/cancellation

### Access Control & Security

- **Role-Based Access Control**: Three-tier permission system (Admin/Manager/Member)
- **Restaurant-Based Restrictions**: Users scoped to specific restaurant locations
- **Restaurant-Level Isolation**: Managers and members limited to their assigned restaurant
- **POS-Style Interface**: Intuitive order creation and management for restaurant staff
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

[![Frontend Skills](https://skillicons.dev/icons?i=nextjs,typescript,tailwind,apollo&theme=light)](https://skillicons.dev)

- **Next.js 15**: React framework with App Router
- **TypeScript**: Type-safe JavaScript
- **Tailwind CSS**: Utility-first CSS framework
- **Apollo Client**: GraphQL client for API communication

### Backend

[![Backend Skills](https://skillicons.dev/icons?i=nodejs,express,apollo,typescript,prisma&theme=light)](https://skillicons.dev)

- **Node.js**: JavaScript runtime
- **Express**: Web framework
- **Apollo Server**: GraphQL server implementation
- **TypeScript**: Type-safe backend development
- **Prisma**: Database ORM and migration tool

### Database & Infrastructure

[![Database & Infrastructure Skills](https://skillicons.dev/icons?i=postgresql,redis,docker,jest&theme=light)](https://skillicons.dev)

- **PostgreSQL**: Primary database
- **Redis**: Caching and session storage
- **Docker**: Containerization
- **Jest**: Unit and integration testing
- **Playwright**: End-to-end testing

### DevOps & Monitoring

[![DevOps & Monitoring](https://skillicons.dev/icons?i=prometheus&theme=light)](https://skillicons.dev)

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
- **Payments**: Payment transactions for orders
- **Payment Methods**: Stored payment methods linked to restaurants
- **Feedback**: User feedback submissions and reviews

### Access Control Matrix

| Category                    | Operation                | ADMIN | MANAGER | MEMBER |
| --------------------------- | ------------------------ | ----- | ------- | ------ |
| **Data Access Permissions** |                          |       |         |        |
|                             | View All Restaurants     | ✅    | ❌      | ❌     |
|                             | View Assigned Restaurant | ❌    | ✅      | ✅     |
|                             | View All Menu Items      | ✅    | ❌      | ❌     |
|                             | View Assigned Menu Items | ❌    | ✅      | ✅     |
|                             | View All Users           | ✅    | ❌      | ❌     |
| **Restaurant Management**   |                          |       |         |        |
|                             | Create Restaurants       | ✅    | ❌      | ❌     |
|                             | Update Restaurants       | ✅    | ❌      | ❌     |
|                             | Delete Restaurants       | ✅    | ❌      | ❌     |
| **Menu Management**         |                          |       |         |        |
|                             | Create Menu Items        | ✅    | ✅      | ❌     |
|                             | Update Menu Items        | ✅    | ✅      | ❌     |
|                             | Delete Menu Items        | ✅    | ✅      | ❌     |
| **Order Management**        |                          |       |         |        |
|                             | View Orders              | ✅    | ✅      | ✅     |
|                             | Create Orders            | ✅    | ✅      | ✅     |
|                             | Checkout/Pay Orders      | ✅    | ✅      | ❌     |
|                             | Cancel Orders            | ✅    | ✅      | ❌     |
|                             | Update Order Status      | ✅    | ✅      | ❌     |
| **Payment Management**      |                          |       |         |        |
|                             | View Payment Methods     | ✅    | ✅      | ❌     |
|                             | Create Payment Methods   | ✅    | ❌      | ❌     |
|                             | Update Payment Methods   | ✅    | ❌      | ❌     |
|                             | Delete Payment Methods   | ✅    | ❌      | ❌     |
|                             | Process Payments         | ✅    | ✅      | ❌     |
| **User Management**         |                          |       |         |        |
|                             | Create Users             | ✅    | ❌      | ❌     |
|                             | Update Users             | ✅    | ❌      | ❌     |
|                             | Delete Users             | ✅    | ❌      | ❌     |
| **Feedback Management**     |                          |       |         |        |
|                             | Submit Feedback          | ✅    | ✅      | ✅     |
| **Authentication**          |                          |       |         |        |
|                             | Register Users           | ✅    | ❌      | ❌     |
|                             | Login                    | ✅    | ✅      | ✅     |

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
CORS_ORIGIN="https://your-frontend-domain.com"
```

> [!IMPORTANT]
> Set `CORS_ORIGIN` to your frontend's domain(s). For multiple origins, separate with commas:
>
> ```
> CORS_ORIGIN="https://foody.5dev.in,https://another-domain.com"
> ```

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
