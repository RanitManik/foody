# Foody API - Postman Collection

Complete Postman collection for testing all endpoints of the Foody GraphQL API.

## 📦 Files

- `Foody_API_Postman_Collection.json` - Complete API collection with 31 requests
- `Foody_API_Postman_Environment.postman_environment.json` - Environment variables

## 🚀 Quick Start

1. **Install Postman** from [https://www.postman.com/](https://www.postman.com/)

2. **Import the Collection:**
    - Open Postman
    - Click **"Import"** (top left corner)
    - Select **"File"** tab
    - Choose `Foody_API_Postman_Collection.json`

3. **Import the Environment:**
    - Click **"Import"** again
    - Choose `Foody_API_Postman_Environment.postman_environment.json`
    - Select **"Foody API Environment"** from the environment dropdown

4. **Configure Environment:**
    - Update `baseUrl` if your API runs on a different port/host
    - The `graphql` variable will automatically update

## 🔐 Authentication

Most requests require authentication. The collection includes **automatic token management** for login:

### Automatic Login Flow

1. **Login** using the "Login User" request in the Authentication folder
2. **Token is automatically extracted** from the response and saved to the `auth_token` environment variable
3. **All subsequent requests** will automatically use this token in the Authorization header

> ![WARNING]
> **Registration does NOT have automatic token extraction.** After registering, you must manually copy the token from the response and set it as the `auth_token` environment variable, or run the Login request to get automatic token extraction.

### Manual Token Management (if needed)

- Copy the token from any login/register response
- Set the `auth_token` variable manually in the environment
- The token will be used as `Bearer {{auth_token}}` in request headers

### What happens automatically

- ✅ **Login User** request saves token after successful login
- ✅ **All authenticated requests** include `Authorization: Bearer {{auth_token}}` header
- ✅ **Console logs** show success/failure of token extraction

### Testing the flow

1. Run "Register User" first (token must be set manually)
2. Run "Login User" to get automatic token extraction
3. Check the **Test Results** tab - you should see "✅ Login response parsed and token extracted"
4. The `auth_token` environment variable is now set
5. Run any other request - it will automatically include the token

## 📁 API Endpoints

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

## 🔧 Environment Variables

| Variable     | Default Value           | Description           |
| ------------ | ----------------------- | --------------------- |
| `baseUrl`    | `http://localhost:4000` | API server base URL   |
| `graphql`    | `{{baseUrl}}/graphql`   | GraphQL endpoint      |
| `auth_token` | `your-jwt-token-here`   | JWT token after login |

## 📝 Usage Tips

1. **Start with Authentication** - Register or login first
2. **Update Variables** - Replace placeholder IDs with real values from your database
3. **Check Responses** - All requests include comprehensive GraphQL queries with full response data
4. **Role-Based Access** - Some endpoints require admin privileges
5. **Sample Data** - All requests include realistic sample variables

## 🧪 Testing Workflow

1. Register a new user account
2. Login to get JWT token
3. Set `auth_token` in environment
4. Create restaurants (admin only)
5. Add menu items to restaurants
6. Create orders with menu items
7. Process payments
8. Update order statuses as needed

## 📋 Requirements

- Postman (latest version recommended)
- Foody API server running on `http://localhost:4000`
- Valid user credentials for testing

---

Happy API Testing! 🚀
