# Development Guide

This guide covers development setup, coding standards, and contribution guidelines for the Foody project.

## Getting Started

### Prerequisites

- **Node.js**: Version 18 or higher
- **npm**: Latest version (comes with Node.js)
- **PostgreSQL**: Version 15 or higher
- **Redis**: Optional, for caching (version 7+ recommended)
- **Git**: Latest version

### Local Setup

1. **Clone the Repository:**

    ```bash
    git clone https://github.com/RanitManik/foody.git
    cd foody
    ```

2. **Install Dependencies:**

    ```bash
    npm install
    ```

3. **Set up Environment Variables:**

    ```bash
    cp api/.env.example api/.env
    cp web/.env.example web/.env.local
    ```

4. **Configure Database:**
    - Install PostgreSQL locally or use Docker
    - Update `DATABASE_URL` in `api/.env`
    - Create database: `createdb foody`

5. **Set up Database Schema:**

    ```bash
    npm run db:setup
    ```

6. **Start Development Servers:**

    ```bash
    # Terminal 1: API server
    npm run dev:api

    # Terminal 2: Web application
    npm run dev:web
    ```

7. **Access the Application:**
    - Web app: http://localhost:3000
    - API playground: http://localhost:4000/graphql
    - API health: http://localhost:4000/health

## Project Structure

### Monorepo Layout

```
foody/
├── api/                    # Backend GraphQL API
│   ├── src/
│   │   ├── graphql/        # GraphQL schemas and resolvers
│   │   ├── lib/            # Shared utilities
│   │   ├── middleware/     # Express middleware
│   │   ├── metrics/        # Monitoring
│   │   └── main.ts         # Entry point
│   ├── prisma/             # Database schema
│   └── package.json
├── web/                    # Frontend Next.js app
│   ├── src/
│   │   ├── app/            # App router pages
│   │   ├── components/     # React components
│   │   └── lib/            # Utilities
│   └── package.json
├── api-e2e/               # API end-to-end tests
├── web-e2e/               # Web end-to-end tests
└── package.json           # Root package.json
```

### Key Directories

- **`api/src/graphql/`**: Domain-driven GraphQL implementation
- **`api/src/lib/`**: Shared business logic and utilities
- **`api/src/middleware/`**: Express middleware stack
- **`web/src/app/`**: Next.js app router structure
- **`web/src/components/`**: Reusable React components

## Development Workflow

### Nx Commands

The project uses Nx for task orchestration. Common commands:

```bash
# Development
npm run dev              # Start all dev servers
npm run dev:api          # Start API server only
npm run dev:web          # Start web server only

# Building
npm run build            # Build all projects
npm run build:api        # Build API
npm run build:web        # Build web app

# Testing
npm run test             # Run all tests
npm run test:api         # Run API tests
npm run test:web         # Run web tests
npm run e2e              # Run end-to-end tests

# Code Quality
npm run lint             # Lint all code
npm run format           # Format code with Prettier
npm run typecheck        # Type check all projects
```

### Git Workflow

1. **Create Feature Branch:**

    ```bash
    git checkout -b feature/your-feature-name
    ```

2. **Make Changes:**
    - Follow coding standards
    - Write tests for new functionality
    - Update documentation if needed

3. **Run Quality Checks:**

    ```bash
    npm run validate
    ```

4. **Commit Changes:**

    ```bash
    git add .
    git commit -m "feat: add your feature description"
    ```

5. **Push and Create PR:**
    ```bash
    git push origin feature/your-feature-name
    ```

## Coding Standards

### TypeScript

- **Strict Mode**: All projects use strict TypeScript configuration
- **Type Safety**: Avoid `any` types; use proper type definitions
- **Interfaces vs Types**: Use interfaces for object shapes, types for unions
- **Null Safety**: Use strict null checks; prefer optional chaining

### GraphQL

- **Schema Documentation**: All types and fields must have descriptions
- **Resolver Structure**: Follow domain-driven organization
- **Error Handling**: Use proper GraphQL error formatting
- **Type Safety**: Generated types from schema

### React

- **Functional Components**: Use functional components with hooks
- **TypeScript**: Fully typed components and props
- **Component Naming**: PascalCase for component names
- **File Naming**: kebab-case for files, PascalCase for components

### Database

- **Prisma Schema**: Follow Prisma best practices
- **Migrations**: Use Prisma migrations for schema changes
- **Indexing**: Add appropriate database indexes
- **Constraints**: Use database constraints for data integrity

## Testing

### Testing Strategy

- **Unit Tests**: Test individual functions and components
- **Integration Tests**: Test API endpoints and database interactions
- **E2E Tests**: Test complete user workflows

### Running Tests

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test -- --watch

# Run tests with coverage
npm run test -- --coverage

# Run specific test file
npm run test -- api/src/graphql/auth/resolver.spec.ts
```

### Writing Tests

**API Tests (Jest):**

```typescript
describe("Auth Resolver", () => {
    it("should register a new user", async () => {
        const result = await resolver.register(mockContext, {
            input: validRegisterInput,
        });

        expect(result).toHaveProperty("token");
        expect(result.user).toHaveProperty("id");
    });
});
```

**Component Tests (Testing Library):**

```typescript
describe('LoginForm', () => {
  it('should submit login form', async () => {
    render(<LoginForm />);

    await userEvent.type(screen.getByLabelText(/email/i), 'test@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'password');
    await userEvent.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password'
      });
    });
  });
});
```

## API Development

### Adding New GraphQL Operations

1. **Define Schema:**

    ```typescript
    // api/src/graphql/your-domain/schema.ts
    export const typeDefs = `#graphql
      type YourType {
        id: ID!
        name: String!
      }
    
      type Query {
        yourQuery: YourType
      }
    `;
    ```

2. **Implement Resolver:**

    ```typescript
    // api/src/graphql/your-domain/resolver.ts
    export const resolvers = {
        Query: {
            yourQuery: async (_: any, __: any, context: GraphQLContext) => {
                // Implementation
            },
        },
    };
    ```

3. **Update Main Schema:**

    ```typescript
    // api/src/graphql/index.ts
    import { typeDefs as yourTypeDefs } from "./your-domain/schema";
    import { yourResolvers } from "./your-domain/resolver";

    export const typeDefs = mergeTypeDefs([
        // ... existing typeDefs
        yourTypeDefs,
    ]);

    export const resolvers = mergeResolvers([
        // ... existing resolvers
        yourResolvers,
    ]);
    ```

4. **Add Tests:**
    ```typescript
    // api/src/graphql/your-domain/__tests__/resolver.spec.ts
    describe("Your Domain Resolver", () => {
        // Tests
    });
    ```

### Database Changes

1. **Update Prisma Schema:**

    ```prisma
    // api/prisma/schema.prisma
    model YourModel {
      id        String   @id @default(cuid())
      name      String
      createdAt DateTime @default(now())
    }
    ```

2. **Generate Migration:**

    ```bash
    npm run db:migrate
    ```

3. **Update Client:**
    ```bash
    npm run db:generate
    ```

## Frontend Development

### Component Structure

```typescript
// web/src/components/ui/Button.tsx
interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
  onClick?: () => void;
}

export function Button({ children, variant = 'primary', onClick }: ButtonProps) {
  return (
    <button
      className={cn(
        'px-4 py-2 rounded-md font-medium',
        variant === 'primary' && 'bg-blue-600 text-white',
        variant === 'secondary' && 'bg-gray-200 text-gray-800'
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
```

### GraphQL Queries

```typescript
// web/src/lib/graphql/queries.ts
import { gql } from "@apollo/client";

export const GET_USER = gql`
    query GetUser($id: ID!) {
        user(id: $id) {
            id
            email
            firstName
            lastName
            role
        }
    }
`;
```

### Page Structure

```typescript
// web/src/app/dashboard/page.tsx
export default function DashboardPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
      {/* Page content */}
    </div>
  );
}
```

## Debugging

### API Debugging

- **GraphQL Playground**: Use http://localhost:4000/graphql for testing queries
- **Database Logs**: Check PostgreSQL logs for query issues
- **Application Logs**: View structured logs with correlation IDs

### Frontend Debugging

- **React DevTools**: Inspect component tree and state
- **Apollo DevTools**: Monitor GraphQL queries and cache
- **Browser DevTools**: Network tab for API calls, Console for errors

### Common Issues

1. **Database Connection Issues:**
    - Check DATABASE_URL in .env
    - Ensure PostgreSQL is running
    - Verify database exists

2. **GraphQL Errors:**
    - Check schema for typos
    - Verify resolver implementations
    - Test with GraphQL playground

3. **Build Errors:**
    - Clear Nx cache: `npx nx reset`
    - Delete node_modules and reinstall
    - Check TypeScript errors

## Performance Optimization

### Backend

- **Database Queries**: Use select fields, avoid N+1 queries
- **Caching**: Implement Redis caching for frequent data
- **Indexing**: Add database indexes for query optimization

### Frontend

- **Code Splitting**: Use dynamic imports for large components
- **Image Optimization**: Use Next.js Image component
- **Bundle Analysis**: Analyze bundle size with `npm run build`

## Security Considerations

### Input Validation

- **Zod Schemas**: Validate all inputs on API
- **Sanitization**: Sanitize user inputs
- **Type Safety**: Use TypeScript for type validation

### Authentication

- **JWT Security**: Use strong secrets, implement refresh tokens
- **Password Policies**: Enforce strong password requirements
- **Session Management**: Implement proper session handling

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for detailed contribution guidelines.

### Pull Request Process

1. **Fork and Clone**
2. **Create Feature Branch**
3. **Make Changes**
4. **Write Tests**
5. **Run Quality Checks**
6. **Submit PR**

### Code Review Checklist

- [ ] Tests pass
- [ ] Code follows style guidelines
- [ ] Documentation updated
- [ ] Security considerations addressed
- [ ] Performance impact assessed
