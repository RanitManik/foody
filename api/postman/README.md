# Foody API - Postman Collections

Complete Postman collection for testing all endpoints of the Foody GraphQL API with automated role-based testing.

<details>
<summary><strong>Table of Contents</strong> (Click to Expand)</summary>

- [**Files**](#files)
    - [Manual Testing Collection](#manual-testing-collection)
    - [Automated Complete Flow Collection](#automated-complete-flow-collection)
- [**Quick Start**](#quick-start)
- [**API Endpoints**](#api-endpoints)
- [**Environment Variables**](#environment-variables)
- [**Requirements**](#requirements)
- [**Automated Complete Flow Collection**](#automated-complete-flow-collection-1)
    - [Admin Flow](#admin-flow)
    - [Manager Flow](#manager-flow)
    - [Member Flow](#member-flow)
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

### Automated Complete Flow Collection

- `Foody_Complete_Flow_Automated.json` - **Complete automated flow** (~30 requests) - Tests all roles (Admin, Manager, Member) in one sequential run

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

## Automated Complete Flow Collection

**Single comprehensive collection** that tests all roles (Admin, Manager, Member) in one sequential run.

**Why Single Collection?**

- ✅ No dependency issues (admin creates all necessary data first)
- ✅ Tests all 5 problem statement functions for all 3 roles in one run
- ✅ Sequential execution: Admin Setup → Manager Tests → Member Tests
- ✅ Create → Verify pattern for data consistency
- ✅ ~30 comprehensive tests covering complete functionality

**Key Features:**

- Auto-login with JWT token capture and injection for each role
- Sequential execution for Collection Runner
- Automated response validation
- Self-contained (no manual token management)
- Organized into folders by role

### Admin Flow

**User:** Nick Fury (admin@foody.com) | **Role:** ADMIN | **Tests:** 12

**Capabilities:**

- Full CRUD on all entities
- User management (create, update, delete)
- Global restaurant access (all countries)
- Payment method management
- Order lifecycle management
- Payment processing

**Test Flow:**

```
1. Login → 2. View Restaurants (Function 1) → 3. View Menu Items (Function 1)
4. Create Restaurant → 5. Create Menu Item → 6. Create Payment Method (Function 5)
7. Create & Place Order (Functions 2 & 3) → 8. Verify Order in List
9. Process Payment → 10. Update Order Status → 11. Cancel Order (Function 4)
12. Update Payment Method (Function 5)
```

**Expected Results:**

- ✅ All 12 tests pass
- ✅ All CRUD operations succeed
- ✅ Admin can view and manage all resources

---

### Manager Flow

**User:** Captain Marvel (captain.marvel@foody.com) | **Role:** MANAGER_INDIA | **Tests:** 8

**Capabilities:**

- Country-based restaurant filtering (INDIA only)
- Menu item viewing (read-only for testing)
- Order status updates
- Payment method viewing (read-only)

**Restrictions:**

- ❌ Cannot create payment methods (admin-only)
- ❌ Cannot update payment methods (admin-only)
- ❌ Cannot access other countries' restaurants
- ✅ Can view payment methods
- ✅ Can update order status

**Test Flow:**

```
1. Login → 2. View India Restaurants Only (Function 1) → 3. View Menu Items (Function 1)
4. BLOCKED Create Payment Method (Function 5) → 5. BLOCKED Update Payment Method (Function 5)
6. ALLOWED Read Payment Methods (Function 5) → 7. View Orders & Extract ID
8. Update Order Status (Function 4)
```

**Expected Results:**

- ✅ All 8 tests pass
- ✅ Only INDIA restaurants visible
- ✅ Payment method operations correctly blocked
- ✅ Order status updates succeed

---

### Member Flow

**User:** Thanos (thanos@foody.com) | **Role:** MEMBER_INDIA | **Tests:** 7

**Capabilities:**

- Read-only access to restaurants (country-filtered)
- Read-only access to menu items (country-filtered)
- View operations only

**Restrictions (Validated):**

- ❌ Cannot place orders (checkout & pay blocked)
- ❌ Cannot create payment methods
- ❌ Cannot update menu items
- ❌ Cannot delete menu items
- ❌ Cannot modify menu items
- ❌ Cannot create restaurants

**Test Flow:**

```
1. Login → 2. View Restaurants (Function 1) → 3. View Menu Items (Function 1)
4. BLOCKED Place Order (Function 3) → 5. BLOCKED Create Payment Method (Function 5)
6. BLOCKED Update Menu Item → 7. BLOCKED Delete Menu Item
```

**Expected Results:**

- ✅ All 7 tests pass (blocks validated as successes)
- ✅ Read operations succeed
- ✅ Write operations properly blocked with error messages

---

## How to Run Collections

### Option 1: Collection Runner (Recommended)

1. Import `Foody_Complete_Flow_Automated.json`
2. Click collection name → **"Run"** button
3. Ensure all requests/folders selected
4. Click **"Run Foody API - Complete Flow (Automated)"**
5. View automated execution results (all ~30 tests run sequentially)

### Option 2: Newman CLI (CI/CD)

```bash
# Install Newman
npm install -g newman

# Run complete flow
newman run Foody_Complete_Flow_Automated.json
```

### Option 3: Manual Execution

1. Open collection
2. Expand folders (Admin Flow, Manager Flow, Member Flow)
3. Run requests sequentially within each folder
4. Tokens auto-captured after each role's login
5. Subsequent requests use stored tokens

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

| Role    | CRUD Access | Country Filtering | User Management | Payment Methods  | Order Management |
| ------- | ----------- | ----------------- | --------------- | ---------------- | ---------------- |
| Admin   | Full        | Global            | ✅              | ✅ Create/Update | All Users        |
| Manager | Limited     | Country-specific  | ❌              | ✅ Read Only     | Country Members  |
| Member  | Read-only   | Country-specific  | ❌              | ❌               | ❌               |

## Troubleshooting

| Issue                          | Solution                                           |
| ------------------------------ | -------------------------------------------------- |
| Token not captured after login | Verify API running on `http://localhost:4000`      |
| "Unauthorized" errors          | Run requests in order (login first in each folder) |
| Order creation fails           | Ensure database seeded (`npm run db:seed`)         |
| Country filtering not working  | Verify user role/country in login response         |
| Newman CLI errors              | Collections use variables, no env file needed      |
| Manager order update fails     | This test auto-skips if no orders exist (expected) |

## Collection Stats

| Collection     | Tests | Duration | Auto-Login   | Folders |
| -------------- | ----- | -------- | ------------ | ------- |
| Complete Flow  | ~30   | ~3-5s    | ✅ (3 roles) | ✅ (3)  |
| - Admin Flow   | 12    | ~2s      | ✅           | -       |
| - Manager Flow | 8     | ~1s      | ✅           | -       |
| - Member Flow  | 7     | ~1s      | ✅           | -       |

**Last Updated:** November 16, 2025  
**API Version:** 1.0.0
