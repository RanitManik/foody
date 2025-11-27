# Development Environment Setup

This guide provides detailed instructions for setting up a complete development environment for the Foody project.

## Prerequisites

### System Requirements

- **Operating System**: macOS 12+, Windows 10+, or Linux (Ubuntu 20.04+)
- **Memory**: 8GB RAM minimum, 16GB recommended
- **Storage**: 10GB free space
- **Network**: Stable internet connection

### Required Software

#### Node.js and npm

```bash
# Check current version
node --version
npm --version

# Install Node.js 22+ if needed
# macOS with Homebrew
brew install node

# Windows - download from nodejs.org
# Linux - use package manager
```

#### Git

```bash
# Check installation
git --version

# Configure Git (replace with your details)
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

#### PostgreSQL

```bash
# macOS with Homebrew
brew install postgresql
brew services start postgresql
createdb foody

# Windows - download from postgresql.org
# Linux
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo -u postgres createdb foody
```

#### Redis (Optional)

```bash
# macOS
brew install redis
brew services start redis

# Windows - download from redis.io
# Linux
sudo apt install redis-server
sudo systemctl start redis
```

## Project Setup

### 1. Clone Repository

```bash
git clone https://github.com/RanitManik/foody.git
cd foody
```

### 2. Install Dependencies

```bash
# Install all workspace dependencies
npm install

# Verify installation
npm run nx --version
```

### 3. Environment Configuration

#### API Environment (.env)

```bash
cp api/.env.example api/.env
```

Edit `api/.env` with your local configuration:

```env
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/foody"
DATABASE_URL_UNPOOLED="postgresql://postgres:password@localhost:5432/foody"

# JWT Secret (generate a secure random string)
JWT_SECRET="your-super-secure-jwt-secret-change-this-in-production"

# Redis (optional)
REDIS_URL="redis://localhost:6379"

# Server Configuration
HOST="localhost"
PORT=4000
NODE_ENV="development"

# CORS (for local development)
CORS_ORIGIN="http://localhost:3000"

# Logging
LOG_LEVEL="debug"
```

#### Web Environment (.env.local)

```bash
cp web/.env.example web/.env.local
```

Edit `web/.env.local`:

```env
NEXT_PUBLIC_API_URL="http://localhost:4000/graphql"
```

### 4. Database Setup

#### Create Database User (Optional but Recommended)

```sql
-- Connect to PostgreSQL as superuser
psql -U postgres

-- Create foody database and user
CREATE DATABASE foody;
CREATE USER foody_dev WITH PASSWORD 'dev_password';
GRANT ALL PRIVILEGES ON DATABASE foody TO foody_dev;
\q
```

Update your `api/.env` with the new credentials:

```env
DATABASE_URL="postgresql://foody_dev:dev_password@localhost:5432/foody"
DATABASE_URL_UNPOOLED="postgresql://foody_dev:dev_password@localhost:5432/foody"
```

#### Run Database Migrations

```bash
# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate

# Seed database with test data
npm run db:seed
```

### 5. Verify Setup

#### Test Database Connection

```bash
# Test Prisma connection
cd api
npx prisma db push --preview-feature
```

#### Run Health Checks

```bash
# Start API server
npm run dev:api

# In another terminal, test health endpoint
curl http://localhost:4000/health
```

Expected response:

```json
{
    "status": "ok",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "version": "1.0.0"
}
```

## Development Workflow

### Starting Development Servers

#### Option 1: Start All Services

```bash
npm run dev
```

This starts both API and web servers in parallel.

#### Option 2: Start Individual Services

```bash
# Terminal 1: API Server
npm run dev:api

# Terminal 2: Web Application
npm run dev:web
```

### Accessing the Application

- **Web Application**: http://localhost:3000
- **API GraphQL Playground**: http://localhost:4000/graphql
- **API Health Check**: http://localhost:4000/health
- **API Metrics**: http://localhost:4000/metrics
- **Database Studio**: `npm run db:studio`

### Testing the Setup

#### Create Test User

Use the GraphQL playground to create a test admin user:

```graphql
mutation Register {
    register(
        input: {
            email: "admin@foody.test"
            password: "password123"
            firstName: "Test"
            lastName: "Admin"
            role: ADMIN
        }
    ) {
        token
        user {
            id
            email
            role
        }
    }
}
```

#### Login and Test

```graphql
mutation Login {
    login(input: { email: "admin@foody.test", password: "password123" }) {
        token
        user {
            id
            email
            role
        }
    }
}
```

## IDE Setup

### Visual Studio Code (Recommended)

#### Required Extensions

```json
{
    "recommendations": [
        "ms-vscode.vscode-typescript-next",
        "bradlc.vscode-tailwindcss",
        "ms-vscode.vscode-json",
        "esbenp.prettier-vscode",
        "dbaeumer.vscode-eslint",
        "ms-vscode.vscode-jest",
        "graphql.vscode-graphql",
        "prisma.prisma"
    ]
}
```

#### Workspace Settings

Create `.vscode/settings.json`:

```json
{
    "typescript.preferences.importModuleSpecifier": "relative",
    "editor.formatOnSave": true,
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "editor.codeActionsOnSave": {
        "source.fixAll.eslint": "explicit"
    },
    "tailwindCSS.experimental.classRegex": [
        ["cva\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"],
        ["cx\\(([^)]*)\\)", "(?:'|\"|`)([^']*)(?:'|\"|`)"]
    ],
    "graphql-config.load.legacy": true
}
```

### Other IDEs

#### WebStorm/IntelliJ IDEA

- Install Prisma plugin
- Configure TypeScript compiler
- Set up Prettier and ESLint

#### Vim/Neovim

- Install TypeScript language server
- Configure Prettier and ESLint
- Set up GraphQL syntax highlighting

## Docker Development (Alternative)

### Using Docker Compose

If you prefer Docker for development:

```yaml
# docker-compose.dev.yml
version: "3.8"

services:
    db:
        image: postgres:15
        environment:
            POSTGRES_DB: foody
            POSTGRES_USER: foody_dev
            POSTGRES_PASSWORD: dev_password
        ports:
            - "5432:5432"
        volumes:
            - postgres_data:/var/lib/postgresql/data

    redis:
        image: redis:7-alpine
        ports:
            - "6379:6379"

    api:
        build:
            context: ./api
            dockerfile: Dockerfile.dev
        environment:
            - DATABASE_URL=postgresql://foody_dev:dev_password@db:5432/foody
            - REDIS_URL=redis://redis:6379
            - JWT_SECRET=dev-jwt-secret
        ports:
            - "4000:4000"
        volumes:
            - ./api:/app
            - /app/node_modules
        depends_on:
            - db
            - redis

volumes:
    postgres_data:
```

```bash
# Start services
docker-compose -f docker-compose.dev.yml up -d

# Run migrations in container
docker-compose -f docker-compose.dev.yml exec api npm run db:setup
```

## Troubleshooting

### Common Issues

#### Port Conflicts

```bash
# Check what's using ports
lsof -i :3000
lsof -i :4000
lsof -i :5432

# Kill process using port
kill -9 <PID>
```

#### Database Connection Issues

```bash
# Test PostgreSQL connection
psql -U foody_dev -d foody -h localhost

# Check PostgreSQL service status
# macOS
brew services list | grep postgresql

# Linux
sudo systemctl status postgresql
```

#### Node.js Version Issues

```bash
# Use nvm to manage Node versions
nvm install 18
nvm use 18
nvm alias default 18
```

#### Permission Issues

```bash
# Fix npm permissions
sudo chown -R $(whoami) ~/.npm
```

### Getting Help

#### Logs and Debugging

```bash
# View API logs
npm run dev:api  # Look for error messages

# Check database logs
tail -f /usr/local/var/log/postgresql.log  # macOS with Homebrew

# Clear Nx cache
npx nx reset
```

#### Reset Development Environment

```bash
# Stop all processes
pkill -f "nx|next|node"

# Reset database
npm run db:reset

# Clear caches
rm -rf node_modules/.cache
rm -rf .nx/cache

# Reinstall dependencies
npm install
```

## Advanced Setup

### Multiple Environments

Set up separate environments for different features:

```bash
# Create environment files
cp api/.env api/.env.feature-branch
cp web/.env.local web/.env.local.feature-branch

# Use different databases
# Update DATABASE_URL in .env.feature-branch
```

### Performance Optimization

```bash
# Enable Redis caching
# Update REDIS_URL in .env

# Configure database connection pooling
# Add connection pool settings to DATABASE_URL
```

### Testing Setup

```bash
# Run tests
npm run test

# Run tests in watch mode
npm run test -- --watch

# Run specific tests
npm run test:api -- --testPathPattern=auth
```

## Next Steps

Once your environment is set up:

1. **Explore the Codebase**: Read the main README and architecture docs
2. **Run the Tests**: Ensure everything works with `npm run validate`
3. **Make Your First Change**: Try adding a small feature or fixing a bug
4. **Learn the Workflow**: Understand Nx commands and Git workflow
5. **Contribute**: Follow the contributing guidelines for your first PR

## Support

- **Documentation**: Check the docs folder for detailed guides
- **Issues**: Report setup problems on GitHub Issues
- **Discussions**: Ask questions in GitHub Discussions
- **Code Examples**: Look at existing code for patterns and conventions
