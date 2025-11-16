# Foody API - Postman Collections

Complete Postman collections for testing all endpoints of the Foody GraphQL API with automated role-based testing.

<details>
<summary><strong>Table of Contents</strong> (Click to Expand)</summary>

- [**Files**](#files)
    - [Manual Testing Collection](#manual-testing-collection)
    - [Automated Role-Based Collections](#automated-role-based-collections)
- [**Quick Start**](#quick-start)
- [**API Endpoints**](#api-endpoints)
- [**Environment Variables**](#environment-variables)
- [**Requirements**](#requirements)
- [**Automated Role-Based Collections**](#automated-role-based-collections-1)
    - [Admin Collection](#admin-collection)
    - [Manager Collection](#manager-collection)
    - [Member Collection](#member-collection)
- [**How to Run Collections**](#how-to-run-collections)
    - [Option 1: Collection Runner (Recommended)](#option-1-collection-runner-recommended)
    - [Option 2: Newman CLI (CI/CD)](#option-2-newman-cli-cicd)
    - [Option 3: Manual Execution](#option-3-manual-execution)
- [**Test User Credentials**](#test-user-credentials)
- [**Validation Summary**](#validation-summary)
- [**Troubleshooting**](#troubleshooting)
- [**Collection Stats**](#collection-stats)

</details>

## Files

### Manual Testing Collection

- `Foody_API_Postman_Collection.json` - Complete API collection with 31 requests for manual testing
- `Foody_API_Postman_Environment.postman_environment.json` - Environment variables (optional)

### Automated Role-Based Collections

- `Foody_Admin_Collection.json` - **Admin** automated flow (17 requests) - Full CRUD access
- `Foody_Manager_Collection.json` - **Manager India** automated flow (13 requests) - Country-based restrictions
- `Foody_Member_Collection.json` - **Member India** automated flow (10 requests) - Read-only + blocks validation

> [!IMPORTANT]
> **Before using these collections**, ensure you have seeded the database with test data by running:
>
> ```bash
> npm run db:seed
> ```
>
> This will create all test users with the password `ChangeMe123!` and populate sample restaurants and menu items.

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
    - JWT tokens are automatically captured and injected after login

## API Endpoints

| Category       | Endpoints                                                                                                                          | Count |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ----- |
| Authentication | Register, Login, Get Current User                                                                                                  | 3     |
| Restaurants    | List, Get Details, Create (Admin), Update (Admin), Delete (Admin)                                                                  | 5     |
| Menu Items     | List, Get Details, Get Categories, Create (Admin/Manager), Update (Admin/Manager), Delete (Admin/Manager)                          | 6     |
| Orders         | List, Get Details, Create (Admin/Manager), Update Status (Admin/Manager), Cancel (Admin/Manager)                                   | 5     |
| Payments       | List Methods, Get Method, List Payments (Admin), Get Payment (Admin), Create Method, Update Method, Delete Method, Process Payment | 8     |
| Users          | List (Admin), Get (Admin), Update (Admin), Delete (Admin)                                                                          | 4     |

## Environment Variables

| Variable            | Collection             | Default Value              | Description                              |
| ------------------- | ---------------------- | -------------------------- | ---------------------------------------- |
| `baseUrl`           | All                    | `http://localhost:4000`    | API server base URL                      |
| `graphql`           | All                    | `{{baseUrl}}/graphql`      | GraphQL endpoint URL                     |
| `auth_token`        | All                    | `""`                       | JWT token (auto-set after login)         |
| `user_id`           | Manual, Admin          | `""`                       | User ID for testing operations           |
| `restaurant_id`     | All                    | `""`                       | Restaurant ID for testing operations     |
| `menu_item_id`      | All                    | `""`                       | Menu item ID for testing operations      |
| `order_id`          | Manual, Admin, Manager | `""`                       | Order ID for testing operations          |
| `payment_method_id` | Manual, Admin, Manager | `""`                       | Payment method ID for testing operations |
| `payment_id`        | Admin                  | `""`                       | Payment ID for testing operations        |
| `admin_email`       | Admin                  | `admin@foody.com`          | Admin login email address                |
| `admin_password`    | Admin                  | `ChangeMe123!`             | Admin login password                     |
| `manager_email`     | Manager                | `captain.marvel@foody.com` | Manager India login email address        |
| `manager_password`  | Manager                | `ChangeMe123!`             | Manager India login password             |
| `member_email`      | Member                 | `thanos@foody.com`         | Member India login email address         |
| `member_password`   | Member                 | `ChangeMe123!`             | Member India login password              |

> [!NOTE]
> **Variable Availability:** Not all variables are present in every collection. The "Collection" column indicates which collections include each variable. For example, `admin_email` and `admin_password` are only available in the Admin collection, while `auth_token` is available in all the collections. Each collection includes only the variables relevant to its testing scope.

## Requirements

- Postman (latest version)
- Foody API server running on `http://localhost:4000`
- Database seeded with test data (`npm run db:seed`)

## Automated Role-Based Collections

Three automated collections for comprehensive RBAC testing with automatic authentication and validation:

- **Admin Collection** - Full system access and CRUD operations
- **Manager Collection** - Country-restricted management capabilities
- **Member Collection** - Read-only access with write operation blocking

**Key Features:**

- Auto-login with JWT token capture and injection
- Sequential execution for Collection Runner
- Automated response validation
- Self-contained (no manual token management)

### Admin Collection

**User:** Nick Fury (admin@foody.com) | **Role:** ADMIN | **Requests:** 14

**Capabilities:**

- Full CRUD on all entities
- User management (create, update, delete)
- Global restaurant access (all countries)
- Payment method management
- Order lifecycle management
- Payment processing

**Execution Flow:**

```
1. Login → 2. Get Current User → 3. Create User → 4. Get All Users → 5. Update User
6. Create Restaurant → 7. Get Restaurants → 8. Create Menu Item → 9. Update Menu Item
10. Create Payment Method → 11. Get Payment Methods → 12. Create Order → 13. Get Orders
14. Update Order Status → 15. Process Payment → 16. Get All Payments
```

**Expected Results:**

- ✅ All 14 requests pass
- ✅ All CRUD operations succeed
- ✅ Admin can view all orders and payments

### Manager Collection

**User:** Captain Marvel (captain.marvel@foody.com) | **Role:** MANAGER_INDIA | **Requests:** 12

**Capabilities:**

- Country-based restaurant filtering (INDIA only)
- Menu item CRUD for assigned country
- Order creation and status updates
- Payment processing
- Member order management

**Restrictions:**

- ❌ Cannot access other countries' restaurants
- ❌ Cannot modify cross-country data
- ✅ Can manage country-specific member orders

**Execution Flow:**

```
1. Login → 2. Get Current User → 3. Get India Restaurants → 4. Get Menu Items
5. Create Menu Item → 6. Update Menu Item → 7. Create Payment Method → 8. Create Order
9. Get Orders → 10. Update Order Status → 11. Process Payment → 12. Get Payment Methods
```

**Expected Results:**

- ✅ All 12 requests pass
- ✅ Only INDIA restaurants visible
- ✅ CRUD operations succeed within country scope

### Member Collection

**User:** Thanos (thanos@foody.com) | **Role:** MEMBER_INDIA | **Requests:** 10

**Capabilities:**

- Read-only access to restaurants (country-filtered)
- Read-only access to menu items (country-filtered)
- View operations only

**Restrictions (Validated):**

- ❌ Cannot place orders
- ❌ Cannot cancel orders
- ❌ Cannot manage payment methods
- ❌ Cannot modify menu items
- ❌ Cannot create restaurants

**Execution Flow:**

```
1. Login → 2. Get Current User → 3. Get Restaurants → 4. Get Menu Items
5. BLOCKED: Create Payment → 6. BLOCKED: Create Order → 7. BLOCKED: Cancel Order
8. BLOCKED: Update Menu → 9. BLOCKED: Delete Menu → 10. BLOCKED: Create Restaurant
```

**Expected Results:**

- ✅ All 10 requests pass (blocks validated as successes)
- ✅ Read operations succeed
- ✅ Write operations properly blocked with error messages

## How to Run Collections

### Option 1: Collection Runner (Recommended)

1. Import collection (Admin/Manager/Member)
2. Click collection name → **"Run"** button
3. Ensure all requests selected
4. Click **"Run [Collection Name]"**
5. View automated execution results

### Option 2: Newman CLI (CI/CD)

```bash
# Install Newman
npm install -g newman

# Run collections
newman run Foody_Admin_Collection.json
newman run Foody_Manager_Collection.json
newman run Foody_Member_Collection.json
```

### Option 3: Manual Execution

1. Open collection
2. Run requests sequentially (01, 02, 03...)
3. Token auto-captured after login
4. Subsequent requests use stored token

## Test User Credentials

| Role            | Email                     | Password     | Country      |
| --------------- | ------------------------- | ------------ | ------------ |
| Admin           | admin@foody.com           | ChangeMe123! | N/A (Global) |
| Manager India   | captain.marvel@foody.com  | ChangeMe123! | INDIA        |
| Manager America | captain.america@foody.com | ChangeMe123! | AMERICA      |
| Member India    | thanos@foody.com          | ChangeMe123! | INDIA        |
| Member India    | thor@foody.com            | ChangeMe123! | INDIA        |
| Member America  | travis@foody.com          | ChangeMe123! | AMERICA      |

## Validation Summary

| Collection | CRUD Access | Country Filtering | User Management | Payment Methods | Order Management |
| ---------- | ----------- | ----------------- | --------------- | --------------- | ---------------- |
| Admin      | Full        | Global            | ✅              | ✅              | All Users        |
| Manager    | Limited     | Country-specific  | ❌              | ❌              | Country Members  |
| Member     | Read-only   | Country-specific  | ❌              | ❌              | ❌               |

## Troubleshooting

| Issue                          | Solution                                      |
| ------------------------------ | --------------------------------------------- |
| Token not captured after login | Verify API running on `http://localhost:4000` |
| "Unauthorized" errors          | Run the "Login" request first (always #01)    |
| Order creation fails           | Ensure database seeded (`npm run db:seed`)    |
| Country filtering not working  | Verify user role/country in Get Current User  |
| Newman CLI errors              | Collections use variables, no env file needed |

## Collection Stats

| Collection | Requests | Duration | Auto-Login | Auto-Cleanup |
| ---------- | -------- | -------- | ---------- | ------------ |
| Admin      | 14       | ~2-3s    | ✅         | N/A          |
| Manager    | 12       | ~1-2s    | ✅         | N/A          |
| Member     | 10       | ~1s      | ✅         | N/A          |

**Last Updated:** November 16, 2025  
**API Version:** 1.0.0
