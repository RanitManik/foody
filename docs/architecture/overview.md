# System Architecture

## Overview

Foody is a modern restaurant operations management platform built with a microservices-inspired architecture using Nx monorepo. The system implements comprehensive role-based access control with restaurant-based data isolation.

## High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Frontend  │    │   GraphQL API   │    │   Database      │
│   (Next.js)     │◄──►│   (Node.js)     │◄──►│   (PostgreSQL)  │
│                 │    │                 │    │                 │
│ - React SPA     │    │ - Express       │    │ - Prisma ORM    │
│ - Apollo Client │    │ - Apollo Server │    │ - Migrations    │
│ - Tailwind CSS  │    │ - JWT Auth      │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 ▼
                    ┌─────────────────┐
                    │   Redis Cache   │
                    │   (Optional)    │
                    └─────────────────┘
```

## Component Architecture

### Frontend (Web)

**Technology Stack:**

- Next.js 15 with App Router
- React 19 with TypeScript
- Tailwind CSS for styling
- Apollo Client for GraphQL
- Radix UI components

**Key Features:**

- POS-style order management interface
- Role-based UI rendering
- Real-time order status updates
- Responsive design for tablets/desktops

**Project Structure:**

```
web/
├── src/
│   ├── app/          # Next.js app router pages
│   ├── components/   # Reusable React components
│   ├── lib/          # Utilities and configurations
│   └── hooks/        # Custom React hooks
```

### Backend (API)

**Technology Stack:**

- Node.js with Express
- Apollo Server for GraphQL
- TypeScript for type safety
- Prisma ORM for database access
- Redis for caching (optional)

**Key Features:**

- Domain-driven GraphQL API
- JWT-based authentication
- Role-based authorization
- Restaurant-scoped data access
- Real-time subscriptions via WebSocket
- Comprehensive middleware stack

**Project Structure:**

```
api/
├── src/
│   ├── graphql/      # GraphQL schemas and resolvers
│   │   ├── auth/     # Authentication domain
│   │   ├── user/     # User management
│   │   ├── restaurant/ # Restaurant operations
│   │   ├── menu/     # Menu management
│   │   ├── order/    # Order processing
│   │   ├── payment/  # Payment handling
│   │   └── feedback/ # Customer feedback
│   ├── lib/          # Shared utilities
│   ├── middleware/   # Express middleware
│   ├── metrics/      # Monitoring
│   └── main.ts       # Application entry point
├── prisma/           # Database schema and migrations
```

### Database Layer

**Technology Stack:**

- PostgreSQL 15+ as primary database
- Prisma as ORM and migration tool
- Redis for caching and sessions

**Data Model:**

- Users with role-based permissions
- Restaurants with location data
- Menu items with categories
- Orders with lifecycle management
- Payments with transaction tracking
- Feedback collection

## Security Architecture

### Authentication & Authorization

- **JWT Tokens**: Stateless authentication with configurable expiration
- **Role-Based Access Control**: Three-tier permission system (ADMIN/MANAGER/MEMBER)
- **Restaurant Scoping**: Managers and members limited to assigned restaurant
- **Input Validation**: Zod schema validation on all inputs
- **Security Headers**: Helmet.js protection against common vulnerabilities

### Data Isolation

- **Restaurant-Based Restrictions**: Users can only access data for their assigned restaurant
- **Database-Level Constraints**: Foreign key relationships enforce data integrity
- **Query Scoping**: All queries automatically filtered by restaurant context

## Performance & Scalability

### Caching Strategy

- **Redis Cache**: Frequently accessed data cached with TTL
- **Database Connection Pooling**: Optimized connection management
- **Query Optimization**: Indexed fields and selective data fetching

### Monitoring & Observability

- **Prometheus Metrics**: Application and system metrics
- **Structured Logging**: Winston-based logging with correlation IDs
- **Health Checks**: Readiness and liveness probes
- **Error Tracking**: Comprehensive error handling and reporting

## Development Workflow

### Nx Monorepo

- **Task Orchestration**: Nx manages build, test, and dev tasks across projects
- **Dependency Management**: Efficient caching and parallel execution
- **Code Generation**: Automated project scaffolding and configuration

### Testing Strategy

- **Unit Tests**: Jest for component and utility testing
- **Integration Tests**: API endpoint testing with test database
- **E2E Tests**: Playwright for full user journey testing
- **Test Coverage**: Comprehensive coverage reporting

### CI/CD Pipeline

- **GitHub Actions**: Automated testing and deployment
- **Code Quality**: ESLint, Prettier, and TypeScript checking
- **Security Scanning**: Automated vulnerability detection
- **Deployment**: Docker-based containerized deployment

## Deployment Architecture

### Containerization

- **Docker**: Multi-stage builds for optimized images
- **Docker Compose**: Local development environment
- **Kubernetes**: Production orchestration (future)

### Environment Configuration

- **Environment Variables**: Configuration management
- **Secrets Management**: Secure credential handling
- **Multi-Environment**: Development, staging, production configs

## API Design Principles

### GraphQL Schema Design

- **Domain-Driven**: Organized by business domains
- **Type Safety**: Strongly typed schemas with TypeScript integration
- **Backward Compatibility**: Version-less API with additive changes
- **Performance**: Query complexity limits and selective field fetching

### RESTful Health Endpoints

- **Health Checks**: Service availability monitoring
- **Metrics Endpoint**: Prometheus-compatible metrics
- **Structured Responses**: Consistent JSON response formats

## Real-time Capabilities

### WebSocket Integration

- **GraphQL Subscriptions**: Real-time data updates
- **Order Notifications**: Live order status tracking
- **Connection Management**: Automatic cleanup and reconnection

## Future Considerations

### Scalability Improvements

- **Microservices Migration**: Potential split into separate services
- **CQRS Pattern**: Command Query Responsibility Segregation
- **Event Sourcing**: Audit trail and event-driven architecture

### Advanced Features

- **Multi-Tenant**: Support for multiple restaurant chains
- **Analytics**: Advanced reporting and business intelligence
- **Integration APIs**: Third-party service integrations
- **Mobile App**: Native mobile application support
