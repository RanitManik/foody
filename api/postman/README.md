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

- `Foody_API_Postman_Automated.json` - **Complete automated flow** (45 requests) - Tests all roles (Admin, Manager, Member) in one sequential run with comprehensive user management testing

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

2. **Choose Your Testing Approach:**

    **For Automated Testing (Recommended):**
    - Import `Foody_API_Postman_Automated.json`
    - Click collection name → **"Run"** button
    - All 45 tests run automatically with role-based validation

    **For Manual Testing:**
    - Import `Foody_API_Postman_Collection.json`
    - Import `Foody_API_Postman_Environment.postman_environment.json` (optional)

3. **Configure Environment:**
    - The `baseUrl` is set to `http://localhost:4000` by default in collection variables
    - Update if your API runs on a different port/host
    - JWT tokens are automatically captured and injected after login

4. **Run Tests:**
    - **Automated:** Click "Run" on the collection for complete validation
    - **Manual:** Execute requests within each folder

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

| Variable            | Collection | Default Value           | Description                              |
| ------------------- | ---------- | ----------------------- | ---------------------------------------- |
| `baseUrl`           | All        | `http://localhost:4000` | API server base URL                      |
| `graphql`           | All        | `{{baseUrl}}/graphql`   | GraphQL endpoint URL                     |
| `auth_token`        | All        | `""`                    | JWT token (auto-set after login)         |
| `admin_token`       | Automated  | `""`                    | Admin JWT token                          |
| `manager_token`     | Automated  | `""`                    | Manager JWT token                        |
| `member_token`      | Automated  | `""`                    | Member JWT token                         |
| `user_id`           | Automated  | `""`                    | Test user ID for management operations   |
| `test_user_token`   | Automated  | `""`                    | Test user JWT token                      |
| `restaurant_id`     | All        | `""`                    | Restaurant ID for testing operations     |
| `menu_item_id`      | All        | `""`                    | Menu item ID for testing operations      |
| `order_id`          | Automated  | `""`                    | Order ID for testing operations          |
| `payment_method_id` | Automated  | `""`                    | Payment method ID for testing operations |
| `payment_id`        | Automated  | `""`                    | Payment ID for testing operations        |

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
- ✅ Sequential execution: Admin Setup → Manager Tests → Member Tests → User Management Tests
- ✅ Create → Verify pattern for data consistency
- ✅ 45 comprehensive tests covering complete functionality including user management
- ✅ Dedicated test user creation and cleanup for safe user management testing

**Key Features:**

- Auto-login with JWT token capture and injection for each role
- Sequential execution for Collection Runner
- Automated response validation
- Self-contained (no manual token management)
- Organized into folders by role

### Admin Flow

**User:** Nick Fury (admin@foody.com) | **Role:** ADMIN | **Tests:** 17

**Capabilities:**

- Full CRUD on all entities
- User management (list, view, update, delete users)
- Global restaurant access (all countries)
- Payment method management
- Order lifecycle management
- Payment processing
- Test user creation and cleanup

**Test Flow:**

```
1. Login as Admin → 2. View Restaurants (Global Access) → 3. View Menu Items (Global Access)
4. Create Restaurant → 5. Create Menu Item → 6. Create Payment Method
7. Create & Place Order → 8. Verify Order in List → 9. Process Payment
10. Update Order Status → 11. Cancel Order → 12. Update Payment Method
12.5. Register Test User for Management → 13. Get All Users → 14. Get User Details
15. Update User → 16. Delete User
```

**Expected Results:**

- ✅ All 16 tests pass
- ✅ All CRUD operations succeed including user management
- ✅ Admin can view and manage all resources
- ✅ Test user created and safely deleted
- ✅ Complete user lifecycle management validated

---

### Manager Flow

**User:** Captain Marvel (captain.marvel@foody.com) | **Role:** MANAGER_INDIA | **Tests:** 13

**Capabilities:**

- Country-based restaurant filtering (INDIA only)
- Menu item viewing and creation for INDIA restaurants
- Order creation, status updates, and cancellation
- Payment method creation (but not updates)
- Cannot create restaurants

**Restrictions:**

- ❌ Cannot update payment methods (admin-only)
- ❌ Cannot delete menu items referenced by orders
- ❌ Cannot create restaurants (admin-only)
- ❌ Cannot access other countries' restaurants
- ✅ Can create payment methods for orders
- ✅ Can manage orders within INDIA scope

**Test Flow:**

```
1. Login as Manager India → 2. View India Restaurants Only → 3. View Menu Items
4. Create Menu Item (India Restaurant) → 5. Create Payment Method (ALLOWED)
6. Update Payment Method (BLOCKED) → 7. Read Payment Methods (ALLOWED)
8. Create Order (India Restaurant) → 9. View Orders & Extract ID
10. Update Order Status → 11. Cancel Order → 12. Delete Menu Item (BLOCKED)
13. Create Restaurant (BLOCKED)
```

**Expected Results:**

- ✅ All 13 tests pass
- ✅ Only INDIA restaurants visible
- ✅ Payment method operations correctly restricted
- ✅ Order management within INDIA scope succeeds
- ✅ Menu item management for INDIA restaurants works
- ✅ Restaurant creation properly blocked

---

### Member Flow

**User:** Thanos (thanos@foody.com) | **Role:** MEMBER_INDIA | **Tests:** 16

**Capabilities:**

- Read-only access to restaurants (country-filtered)
- Read-only access to menu items (country-filtered)
- View operations only

**Restrictions (Validated):**

- ❌ Cannot create orders
- ❌ Cannot place orders (checkout & pay blocked)
- ❌ Cannot cancel orders
- ❌ Cannot create payment methods
- ❌ Cannot update payment methods
- ❌ Cannot process payments
- ❌ Cannot create restaurants
- ❌ Cannot create menu items
- ❌ Cannot update menu items
- ❌ Cannot delete menu items

**Test Flow:**

```
1. Login as Member India → 2. View India Restaurants Only → 3. View Menu Items
4. Create Order (BLOCKED) → 5. Place Order (BLOCKED) → 6. Cancel Order (BLOCKED)
7. Create Payment Method (BLOCKED) → 8. Update Menu Item (BLOCKED)
9. Cancel Order (BLOCKED) → 10. Create Payment Method (BLOCKED)
11. Update Payment Method (BLOCKED) → 12. Process Payment (BLOCKED)
13. Create Restaurant (BLOCKED) → 14. Create Menu Item (BLOCKED)
15. Delete Menu Item (BLOCKED)
```

**Expected Results:**

- ✅ All 16 tests pass (blocks validated as successes)
- ✅ Read operations succeed
- ✅ Write operations properly blocked with error messages
- ✅ Comprehensive security boundary validation

---

## How to Run Collections

### Option 1: Collection Runner (Recommended)

1. Import `Foody_API_Postman_Automated.json`
2. Click collection name → **"Run"** button
3. Ensure all requests/folders selected
4. Click **"Run Foody API - Complete Automated Collection"**
5. View automated execution results (all 45 tests run sequentially)

### Option 2: Newman CLI (CI/CD)

```bash
# Install Newman
npm install -g newman

# Run complete flow
newman run Foody_API_Postman_Automated.json --environment Foody_API_Postman_Environment.postman_environment.json
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
| Complete Flow  | 45    | ~50s     | ✅ (3 roles) | ✅ (3)  |
| - Admin Flow   | 16    | ~20s     | ✅           | -       |
| - Manager Flow | 13    | ~15s     | ✅           | -       |
| - Member Flow  | 16    | ~15s     | ✅           | -       |

**Last Updated:** November 16, 2025  
**API Version:** 1.0.0
