# Contributing to Foody

Thank you for your interest in contributing to Foody! We welcome contributions from everyone. This document provides guidelines and information for contributors.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Submitting Changes](#submitting-changes)
- [Testing](#testing)
- [Documentation](#documentation)
- [Community](#community)

## Code of Conduct

This project follows a [Code of Conduct](CODE_OF_CONDUCT.md) to ensure a welcoming environment for all contributors.

## Getting Started

### Prerequisites

- Node.js 22+
- PostgreSQL 15+
- Redis (optional, for caching)
- Git

### Development Setup

1. **Fork and Clone the Repository**

    ```bash
    git clone https://github.com/YOUR_USERNAME/foody.git
    cd foody
    ```

2. **Install Dependencies**

    ```bash
    npm install
    ```

3. **Set up Environment Variables**

    ```bash
    cp api/.env.example api/.env
    cp web/.env.example web/.env
    ```

    Configure the environment variables as needed.

4. **Set up the Database**

    ```bash
    npm run db:setup
    ```

5. **Start Development Servers**

    ```bash
    npm run dev
    ```

    This will start both the API and web servers.

## Making Changes

### Branch Naming

- Use descriptive branch names
- Prefix with the type of change: `feature/`, `bugfix/`, `docs/`, etc.
- Example: `feature/add-user-authentication`

### Commit Messages

We follow [Conventional Commits](https://conventionalcommits.org/) specification:

```
type(scope): description

[optional body]

[optional footer]
```

Types:

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

Examples:

```
feat(auth): add JWT token validation
fix(api): resolve memory leak in order processing
docs(readme): update installation instructions
```

### Code Style

- Follow the existing code style
- Run `npm run lint` to check for linting issues
- Run `npm run format` to format code
- Pre-commit hooks will automatically format and lint staged files

## Submitting Changes

### Pull Request Process

1. **Create a Pull Request**
    - Ensure your branch is up to date with `main`
    - Push your changes to your fork
    - Create a PR against the `main` branch

2. **PR Description**
    - Provide a clear description of the changes
    - Reference any related issues
    - Include screenshots for UI changes
    - List any breaking changes

3. **Review Process**
    - Maintainers will review your PR
    - Address any feedback or requested changes
    - Once approved, your PR will be merged

### Testing Your Changes

- Run the full test suite: `npm run test`
- Run end-to-end tests: `npm run e2e`
- Test your changes manually
- Ensure all CI checks pass

## Testing

### Unit Tests

```bash
npm run test:api  # API tests
npm run test:web  # Web tests
```

### End-to-End Tests

```bash
npm run e2e:api   # API e2e tests
npm run e2e:web   # Web e2e tests
```

### Manual Testing

- Test the application in your development environment
- Verify all user flows work as expected
- Check for regressions

## Documentation

### Code Documentation

- Add JSDoc comments for new functions and classes
- Keep documentation up to date
- Use clear, descriptive variable and function names

### User Documentation

- Update README.md for significant changes
- Update API documentation if endpoints change
- Add migration guides for breaking changes

## Community

### Getting Help

- Check existing [issues](https://github.com/RanitManik/foody/issues) and [discussions](https://github.com/RanitManik/foody/discussions)
- Join our community discussions
- Contact maintainers for questions

### Recognition

Contributors are recognized in our release notes. We appreciate all contributions, big and small!

Thank you for contributing to Foody! 🚀
