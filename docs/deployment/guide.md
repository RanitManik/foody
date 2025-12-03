# Deployment Guide

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
    - [Required Environment Variables](#required-environment-variables)
- [Database Setup](#database-setup)
- [Docker Deployment](#docker-deployment)
    - [Using Docker Compose](#using-docker-compose)
- [Manual Deployment](#manual-deployment)
- [Monitoring Setup](#monitoring-setup)
- [Troubleshooting](#troubleshooting)

This guide covers deploying the Foody application to production environments.

## Prerequisites

- Docker and Docker Compose
- PostgreSQL 15+ database
- Redis (optional, for caching)
- Node.js 22+ (for build process)

## Environment Setup

### Required Environment Variables

Create `.env` files for each service:

#### API (.env)

```env
# Database
DATABASE_URL="postgresql://user:password@db:5432/foody"
DATABASE_URL_UNPOOLED="postgresql://user:password@db:5432/foody"

# Authentication
JWT_SECRET="your-super-secure-jwt-secret-here"

# Redis (optional)
REDIS_URL="redis://redis:6379"

# Server
HOST="0.0.0.0"
PORT=4000
NODE_ENV="production"

# CORS
CORS_ORIGIN="https://your-frontend-domain.com"

# Logging
LOG_LEVEL="info"
```

#### Web (.env.local)

```env
NEXT_PUBLIC_API_URL="https://your-api-domain.com/graphql"
```

### Database Setup

1. **Create PostgreSQL Database:**

    ```sql
    CREATE DATABASE foody;
    CREATE USER foody_user WITH PASSWORD 'secure_password';
    GRANT ALL PRIVILEGES ON DATABASE foody TO foody_user;
    ```

2. **Run Migrations:**

    ```bash
    cd api
    npm run db:migrate
    npm run db:generate
    ```

3. **Seed Database:**
    ```bash
    npm run db:seed
    ```

## Docker Deployment

### Using Docker Compose

1. **Build and Start Services:**

    ```bash
    docker-compose up -d --build
    ```

2. **Check Service Status:**

    ```bash
    docker-compose ps
    ```

3. **View Logs:**
    ```bash
    docker-compose logs -f api
    docker-compose logs -f web
    ```

### Docker Compose Configuration

```yaml
version: "3.8"

services:
    db:
        image: postgres:15
        environment:
            POSTGRES_DB: foody
            POSTGRES_USER: foody_user
            POSTGRES_PASSWORD: secure_password
        volumes:
            - postgres_data:/var/lib/postgresql/data
        ports:
            - "5432:5432"

    redis:
        image: redis:7-alpine
        ports:
            - "6379:6379"

    api:
        build:
            context: ./api
            dockerfile: Dockerfile
        environment:
            - DATABASE_URL=postgresql://foody_user:secure_password@db:5432/foody
            - REDIS_URL=redis://redis:6379
            - JWT_SECRET=your-jwt-secret
        ports:
            - "4000:4000"
        depends_on:
            - db
            - redis

    web:
        build:
            context: ./web
            dockerfile: Dockerfile
        environment:
            - NEXT_PUBLIC_API_URL=http://api:4000/graphql
        ports:
            - "3000:80"
        depends_on:
            - api

volumes:
    postgres_data:
```

## Manual Deployment

### API Deployment

1. **Build the Application:**

    ```bash
    cd api
    npm run build
    ```

2. **Install Production Dependencies:**

    ```bash
    npm ci --only=production
    ```

3. **Generate Prisma Client:**

    ```bash
    npx prisma generate
    ```

4. **Start the Server:**
    ```bash
    npm start
    ```

### Web Deployment

1. **Build the Application:**

    ```bash
    cd web
    npm run build
    ```

2. **Start the Server:**
    ```bash
    npm start
    ```

## Monitoring Setup

1. **Application Monitoring:**
    - Set up Prometheus metrics collection
    - Configure alerting rules
    - Monitor error rates and performance

2. **Infrastructure Monitoring:**
    - Monitor server resources
    - Set up log aggregation
    - Configure backup monitoring

## Troubleshooting

### Common Issues

1. **Database Connection Issues:**
    - Check DATABASE_URL configuration
    - Verify database server is running
    - Check network connectivity

2. **Redis Connection Issues:**
    - Verify Redis server is running
    - Check REDIS_URL configuration
    - Test Redis connectivity

3. **Build Failures:**
    - Clear Nx cache: `npx nx reset`
    - Reinstall dependencies
    - Check Node.js version compatibility

### Logs and Debugging

1. **Application Logs:**

    ```bash
    docker-compose logs -f api
    ```

2. **Database Logs:**

    ```bash
    docker-compose logs -f db
    ```

3. **Health Checks:**
    - Visit `/health` endpoint
    - Check `/health/ready` for database connectivity
    - Monitor `/metrics` endpoint

## Maintenance

### Regular Tasks

1. **Update Dependencies:**

    ```bash
    npm audit
    npm update
    ```

2. **Database Maintenance:**
    - Run ANALYZE on tables
    - Monitor index usage
    - Clean up old data

3. **Security Updates:**
    - Keep dependencies updated
    - Monitor security advisories
    - Apply security patches promptly

### Monitoring Dashboards

Consider setting up:

- Grafana dashboards for metrics
- ELK stack for log analysis
- APM tools for performance monitoring
