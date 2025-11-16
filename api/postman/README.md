# Foody API - Postman Collections

Complete Postman collections for testing all endpoints of the Foody GraphQL API with automated role-based testing.

<details>
<summary><strong>Table of Contents (Click to Expand)</strong></summary>

## Table of Contents

- [**Files**](#files)
    - [Manual Testing Collection](#manual-testing-collection)
    - [Automated Role-Based Collections](#automated-role-based-collections)
- [**Quick Start**](#quick-start)
- [**Authentication**](#authentication)
    - [Manual Collection (Foody_API_Postman_Collection.json)](#manual-collection-foody_api_postman_collectionjson)
    - [How It Works](#how-it-works)
    - [What's New (v2.1.0)](#whats-new-v210)
    - [Testing the flow](#testing-the-flow)
- [**API Endpoints**](#api-endpoints)
    - [Authentication (3 requests)](#authentication-3-requests)
    - [Menu Management (6 requests)](#menu-management-6-requests)
    - [Order Management (5 requests)](#order-management-5-requests)
    - [Restaurant Management (5 requests)](#restaurant-management-5-requests)
    - [User Management (4 requests)](#user-management-4-requests)
    - [Payment Management (8 requests)](#payment-management-8-requests)
- [**Environment Variables**](#environment-variables)
    - [Manual Testing Collection (Foody_API_Postman_Collection.json)](#manual-testing-collection-foody_api_postman_collectionjson-1)
    - [Admin Collection (Foody_Admin_Collection.json)](#admin-collection-foody_admin_collectionjson-1)
    - [Manager Collection (Foody_Manager_Collection.json)](#manager-collection-foody_manager_collectionjson-1)
    - [Member Collection (Foody_Member_Collection.json)](#member-collection-foody_member_collectionjson-1)
    - [Environment File (Foody_API_Postman_Environment.postman_environment.json)](#environment-file-foody_api_postman_environmentpostman_environmentjson)
- [**Usage Tips**](#usage-tips)
- [**Testing Workflow**](#testing-workflow)
- [**Requirements**](#requirements)
- [**Automated Role-Based Collections**](#automated-role-based-collections)
    - [Overview](#overview)
    - [Admin Collection (Foody_Admin_Collection.json)](#admin-collection-foody_admin_collectionjson)
        - [What It Tests](#what-it-tests)
        - [Run Order](#run-order)
        - [Expected Results](#expected-results)
    - [Manager Collection (Foody_Manager_Collection.json)](#manager-collection-foody_manager_collectionjson)
        - [What It Tests](#what-it-tests-1)
        - [Restrictions Validated](#restrictions-validated)
        - [Run Order](#run-order-1)
        - [Expected Results](#expected-results-1)
    - [Member Collection (Foody_Member_Collection.json)](#member-collection-foody_member_collectionjson)
        - [What It Tests](#what-it-tests-2)
        - [Expected Blocks](#expected-blocks)
        - [Run Order](#run-order-2)
        - [Expected Results](#expected-results-2)
- [**How to Run Automated Collections**](#how-to-run-automated-collections)
    - [Option 1: Collection Runner (Recommended)](#option-1-collection-runner-recommended)
    - [Option 2: Newman CLI (CI/CD)](#option-2-newman-cli-cicd)
    - [Option 3: Manual Sequential Execution](#option-3-manual-sequential-execution)
- [**Test User Credentials**](#test-user-credentials)
- [**Validation Summary**](#validation-summary)
    - [Admin Collection Validates](#admin-collection-validates)
    - [Manager Collection Validates](#manager-collection-validates)
    - [Member Collection Validates](#member-collection-validates)
- [**Troubleshooting**](#troubleshooting)
- [**Quick Stats**](#quick-stats)

</details>

## Files

### Manual Testing Collection

- `Foody_API_Postman_Collection.json` - Complete API collection with 31 requests for manual testing
    - ✅ Auto-token management on login
    - ✅ Collection-level bearer auth
    - ✅ Enhanced console logging
    - ✅ Response validation tests
- `Foody_API_Postman_Environment.postman_environment.json` - Environment variables (optional)

### Automated Role-Based Collections

- `Foody_Admin_Collection.json` - **Admin** automated flow (17 requests) - Full CRUD access
- `Foody_Manager_Collection.json` - **Manager India** automated flow (13 requests) - Country-based restrictions
- `Foody_Member_Collection.json` - **Member India** automated flow (10 requests) - Read-only + blocks validation

## Quick Start

1. **Install Postman** from [https://www.postman.com/](https://www.postman.com/)

2. **Import the Collection:**
    - Open Postman
    - Click **"Import"** (top left corner)
    - Select **"File"** tab
    - Choose `Foody_API_Postman_Collection.json`

3. **Import the Environment (Optional):**
    - Click **"Import"** again
    - Choose `Foody_API_Postman_Environment.postman_environment.json`
    - Select **"Foody API Environment"** from the environment dropdown
    - **Note:** The manual collection now uses collection variables, so environment is optional

4. **Configure Environment:**
    - The `baseUrl` is set to `http://localhost:4000` by default in collection variables
    - Update if your API runs on a different port/host

## Authentication

All collections now feature automatic token management:

### Manual Collection (Foody_API_Postman_Collection.json)

**✅ Improved Auto-Token Management**

- Login/Register requests automatically extract JWT token
- Token saved to collection variables (no environment needed)
- Collection-level bearer auth auto-injects token in all requests
- Enhanced console logging shows user details after login
- Response validation on authentication requests

### How It Works

1. Run "Login User" or "Register User" request
2. Token is automatically extracted and saved to `{{auth_token}}`
3. All subsequent authenticated requests use the token automatically
4. Check console logs for confirmation and user details

### What's New (v2.1.0)

- ✅ Simplified token management (collection variables only)
- ✅ Enhanced console output with emojis and user details
- ✅ Response validation tests on all auth requests
- ✅ Consistent with automated collections
- ✅ Better error handling and user feedback
- ✅ **All authenticated requests** include `Authorization: Bearer {{auth_token}}` header
- ✅ **Console logs** show success/failure of token extraction

### Testing the flow

1. Run "Register User" first (token must be set manually)
2. Run "Login User" to get automatic token extraction
3. Check the **Test Results** tab - you should see "✅ Login response parsed and token extracted"
4. The `auth_token` environment variable is now set
5. Run any other request - it will automatically include the token

## API Endpoints

### Authentication (3 requests)

- Register User
- Login User
- Get Current User (Me)

### Menu Management (6 requests)

- Get Menu Items / Get Menu Item / Get Menu Categories
- Create Menu Item / Update Menu Item / Delete Menu Item

### Order Management (5 requests)

- Get Orders / Get Order
- Create Order / Update Order Status / Cancel Order

### Restaurant Management (5 requests)

- Get Restaurants / Get Restaurant
- Create Restaurant / Update Restaurant / Delete Restaurant

### User Management (4 requests)

- Get Users / Get User (Admin only)
- Update User / Delete User (Admin only)

### Payment Management (8 requests)

- Get Payment Methods / Get Payment Method
- Get Payments / Get Payment (Admin only)
- Create Payment Method / Update Payment Method / Delete Payment Method
- Process Payment

## Environment Variables

### Manual Testing Collection (Foody_API_Postman_Collection.json)

| Variable            | Default Value           | Description                                     |
| ------------------- | ----------------------- | ----------------------------------------------- |
| `baseUrl`           | `http://localhost:4000` | API server base URL                             |
| `graphql`           | `{{baseUrl}}/graphql`   | GraphQL endpoint URL                            |
| `auth_token`        | `""`                    | JWT token (auto-set after login/register)       |
| `user_id`           | `""`                    | Current user ID for testing operations          |
| `restaurant_id`     | `""`                    | Sample restaurant ID for testing operations     |
| `menu_item_id`      | `""`                    | Sample menu item ID for testing operations      |
| `order_id`          | `""`                    | Sample order ID for testing operations          |
| `payment_method_id` | `""`                    | Sample payment method ID for testing operations |

### Admin Collection (Foody_Admin_Collection.json)

| Variable            | Default Value           | Description                                      |
| ------------------- | ----------------------- | ------------------------------------------------ |
| `baseUrl`           | `http://localhost:4000` | API server base URL                              |
| `graphql`           | `{{baseUrl}}/graphql`   | GraphQL endpoint URL                             |
| `auth_token`        | `""`                    | JWT token (auto-set after login)                 |
| `admin_email`       | `admin@foody.com`       | Admin login email address                        |
| `admin_password`    | `ChangeMe123!`          | Admin login password                             |
| `user_id`           | `""`                    | User ID for testing user management operations   |
| `restaurant_id`     | `""`                    | Restaurant ID for testing restaurant operations  |
| `menu_item_id`      | `""`                    | Menu item ID for testing menu operations         |
| `payment_method_id` | `""`                    | Payment method ID for testing payment operations |
| `order_id`          | `""`                    | Order ID for testing order operations            |
| `payment_id`        | `""`                    | Payment ID for testing payment operations        |

### Manager Collection (Foody_Manager_Collection.json)

| Variable            | Default Value              | Description                                      |
| ------------------- | -------------------------- | ------------------------------------------------ |
| `baseUrl`           | `http://localhost:4000`    | API server base URL                              |
| `graphql`           | `{{baseUrl}}/graphql`      | GraphQL endpoint URL                             |
| `auth_token`        | `""`                       | JWT token (auto-set after login)                 |
| `manager_email`     | `captain.marvel@foody.com` | Manager India login email address                |
| `manager_password`  | `ChangeMe123!`             | Manager India login password                     |
| `restaurant_id`     | `""`                       | Restaurant ID for testing restaurant operations  |
| `menu_item_id`      | `""`                       | Menu item ID for testing menu operations         |
| `payment_method_id` | `""`                       | Payment method ID for testing payment operations |
| `order_id`          | `""`                       | Order ID for testing order operations            |

### Member Collection (Foody_Member_Collection.json)

| Variable          | Default Value           | Description                               |
| ----------------- | ----------------------- | ----------------------------------------- |
| `baseUrl`         | `http://localhost:4000` | API server base URL                       |
| `graphql`         | `{{baseUrl}}/graphql`   | GraphQL endpoint URL                      |
| `auth_token`      | `""`                    | JWT token (auto-set after login)          |
| `member_email`    | `thanos@foody.com`      | Member India login email address          |
| `member_password` | `ChangeMe123!`          | Member India login password               |
| `restaurant_id`   | `""`                    | Restaurant ID for testing read operations |
| `menu_item_id`    | `""`                    | Menu item ID for testing read operations  |

### Environment File (Foody_API_Postman_Environment.postman_environment.json)

| Variable     | Default Value           | Description                                                    |
| ------------ | ----------------------- | -------------------------------------------------------------- |
| `baseUrl`    | `http://localhost:4000` | API server base URL                                            |
| `graphql`    | `{{baseUrl}}/graphql`   | GraphQL endpoint URL                                           |
| `auth_token` | `your-jwt-token-here`   | JWT authentication token (manually set if not using auto-auth) |

**Note:** All automated collections (Admin, Manager, Member) use collection variables and don't require the environment file. The manual collection can use either collection variables or the environment file. All collections use consistent variable names without `test_` prefixes.

## Usage Tips

1. **Start with Authentication** - Register or login first
2. **Update Variables** - Replace placeholder IDs with real values from your database
3. **Check Responses** - All requests include comprehensive GraphQL queries with full response data
4. **Role-Based Access** - Some endpoints require admin privileges
5. **Sample Data** - All requests include realistic sample variables

## Testing Workflow

1. Register a new user account
2. Login to get JWT token
3. Set `auth_token` in environment
4. Create restaurants (admin only)
5. Add menu items to restaurants
6. Create orders with menu items
7. Process payments
8. Update order statuses as needed

## Requirements

- Postman (latest version recommended)
- Foody API server running on `http://localhost:4000`

---

## Automated Role-Based Collections

### Overview

Three new automated collections for comprehensive RBAC (Role-Based Access Control) testing:

1. **Admin Collection** - Tests full admin capabilities
2. **Manager Collection** - Tests manager country-based restrictions
3. **Member Collection** - Tests member read-only access and operation blocks

Each collection:

- ✅ **Auto-login** with JWT token capture
- ✅ **Token auto-injection** in all subsequent requests
- ✅ **Sequential execution** designed for Collection Runner
- ✅ **Response validation** with automated tests
- ✅ **Self-contained** - no manual token management needed

---

### Admin Collection (Foody_Admin_Collection.json)

**User:** Nick Fury (admin@foody.com)  
**Role:** ADMIN  
**Requests:** 17

#### What It Tests

- Full CRUD operations on all entities
- User management (create, update, delete)
- Restaurant management (all countries)
- Menu item management
- Payment method management (admin-only)
- Order lifecycle management
- Payment processing

#### Run Order

1. Login → 2. Get Current User → 3. Create User → 4. Get All Users → 5. Update User → 6. Create Restaurant → 7. Get Restaurants → 8. Create Menu Item → 9. Update Menu Item → 10. Create Payment Method → 11. Get Payment Methods → 12. Create Order → 13. Get Orders → 14. Update Order Status → 15. Process Payment → 16. Delete Menu Item → 17. Delete User

#### Expected Results

- ✅ All 17 requests pass
- ✅ All CRUD operations succeed
- ✅ Automatic cleanup at end

---

### Manager Collection (Foody_Manager_Collection.json)

**User:** Captain Marvel (captain.marvel@foody.com)  
**Role:** MANAGER_INDIA  
**Country:** INDIA  
**Requests:** 13

#### What It Tests

- Country-based restaurant filtering (INDIA only)
- Menu item CRUD for India restaurants
- Order creation and status updates
- Payment processing
- Order management for country members

#### Restrictions Validated

- ❌ Cannot access AMERICA restaurants
- ❌ Cannot modify non-India restaurants
- ✅ Can manage India member orders

#### Run Order

1. Login → 2. Get Current User → 3. Get India Restaurants → 4. Get Menu Items → 5. Create Menu Item → 6. Update Menu Item → 7. Create Payment Method → 8. Create Order → 9. Get Orders → 10. Update Order Status → 11. Process Payment → 12. Get Payment Methods → 13. Delete Menu Item

#### Expected Results

- ✅ All 13 requests pass
- ✅ Only INDIA restaurants visible
- ✅ Menu items created/updated successfully

---

### Member Collection (Foody_Member_Collection.json)

**User:** Thanos (thanos@foody.com)  
**Role:** MEMBER_INDIA  
**Country:** INDIA  
**Requests:** 10

#### What It Tests

- Read-only access to restaurants (India)
- Read-only access to menu items (India)
- **Blocking validation** for all write operations

#### Expected Blocks

- ❌ "Members cannot place orders"
- ❌ "Members cannot cancel orders"
- ❌ "Only admins can manage payment methods"
- ❌ "Only admins and managers can modify..."

#### Run Order

1. Login → 2. Get Current User → 3. Get Restaurants → 4. Get Menu Items → 5. BLOCKED: Create Payment → 6. BLOCKED: Create Order → 7. BLOCKED: Cancel Order → 8. BLOCKED: Update Menu → 9. BLOCKED: Delete Menu → 10. BLOCKED: Create Restaurant

#### Expected Results

- ✅ All 10 requests pass (blocks are validated as successes)
- ✅ Read operations succeed
- ✅ Write operations properly blocked with error messages

---

## How to Run Automated Collections

### Option 1: Collection Runner (Recommended)

1. Import the collection (Admin, Manager, or Member)
2. Click on the collection name
3. Click the **"Run"** button (top right)
4. Ensure all requests are selected
5. Click **"Run [Collection Name]"**
6. Watch automated execution with pass/fail indicators

### Option 2: Newman CLI (CI/CD)

```bash
# Install Newman
npm install -g newman

# Run Admin collection
newman run Foody_Admin_Collection.json -e Foody_API_Postman_Environment.postman_environment.json

# Run Manager collection
newman run Foody_Manager_Collection.json -e Foody_API_Postman_Environment.postman_environment.json

# Run Member collection
newman run Foody_Member_Collection.json -e Foody_API_Postman_Environment.postman_environment.json
```

### Option 3: Manual Sequential Execution

1. Open the collection
2. Run requests in order (01, 02, 03, etc.)
3. Token is automatically captured after login
4. All subsequent requests use the stored token

---

## Test User Credentials

| Role            | Email                     | Password     | Country      |
| --------------- | ------------------------- | ------------ | ------------ |
| Admin           | admin@foody.com           | ChangeMe123! | N/A (Global) |
| Manager India   | captain.marvel@foody.com  | ChangeMe123! | INDIA        |
| Manager America | captain.america@foody.com | ChangeMe123! | AMERICA      |
| Member India    | thanos@foody.com          | ChangeMe123! | INDIA        |
| Member India    | thor@foody.com            | ChangeMe123! | INDIA        |
| Member America  | travis@foody.com          | ChangeMe123! | AMERICA      |

---

## Validation Summary

### Admin Collection Validates

- ✅ Full CRUD access to all entities
- ✅ User management (admin-only)
- ✅ Global restaurant access
- ✅ Payment method management (admin-only)
- ✅ Order management for all users

### Manager Collection Validates

- ✅ Country-based restaurant filtering
- ✅ Menu item management for own country
- ✅ Order management for country members
- ✅ Cannot access cross-country data

### Member Collection Validates

- ✅ Read-only access to restaurants
- ✅ Read-only access to menu items
- ✅ Blocked from placing orders
- ✅ Blocked from payment operations
- ✅ Blocked from all write operations

---

## Troubleshooting

**Issue:** Token not captured after login  
**Solution:** Verify API is running on `http://localhost:4000`

**Issue:** "Unauthorized" errors  
**Solution:** Run the "Login" request first (it's always request #01)

**Issue:** Order creation fails  
**Solution:** Ensure database is seeded with test data

**Issue:** Country filtering not working  
**Solution:** Verify user role and country in "Get Current User" request

**Issue:** Newman CLI errors  
**Solution:** Ensure environment file is provided with `-e` flag

---

## Quick Stats

| Collection | Requests | Duration | Auto-Login | Auto-Cleanup |
| ---------- | -------- | -------- | ---------- | ------------ |
| Admin      | 17       | ~2-3s    | ✅         | ✅           |
| Manager    | 13       | ~1-2s    | ✅         | ✅           |
| Member     | 10       | ~1s      | ✅         | N/A          |

---

**Last Updated:** 16th November 2025  
**API Version:** 1.0.0

- Valid user credentials for testing

---

Happy API Testing!
