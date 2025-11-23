// Order GraphQL schema definitions
export const typeDefs = `#graphql
    """
    Represents a customer order containing menu items and payment information.
    Orders go through simplified statuses for POS system record-keeping.
    """
    type Order {
        "Unique identifier for the order"
        id: ID!
        "Current status of the order (PENDING, COMPLETED, CANCELLED)"
        status: OrderStatus!
        "Total amount of the order including all items"
        totalAmount: Decimal!
        "Contact phone number for the order"
        phone: String
        "Special instructions for the order (optional)"
        specialInstructions: String
        "User who placed the order"
        user: User!
        "List of items in the order"
        items: [OrderItem!]!
        "Payment information for the order (null if not paid yet)"
        payment: Payment
        "Timestamp when the order was created"
        createdAt: DateTime!
        "Timestamp when the order was last updated"
        updatedAt: DateTime!
    }

    """
    Represents an individual item within an order, linking to a menu item with quantity and price.
    """
    type OrderItem {
        "Unique identifier for the order item"
        id: ID!
        "Quantity of the menu item ordered"
        quantity: Int!
        "Price per unit at the time of order"
        price: Decimal!
        "Special notes for this item (optional)"
        notes: String
        "Reference to the parent order"
        order: Order!
        "Reference to the menu item ordered"
        menuItem: MenuItem!
        "Timestamp when the order item was created"
        createdAt: DateTime!
        "Timestamp when the order item was last updated"
        updatedAt: DateTime!
    }

    """
    Input for creating a new order with menu items.
    """
    input CreateOrderInput {
        "List of menu items to order with quantities"
        items: [OrderItemInput!]!
        "Contact phone number for the order"
        phone: String
        "Special instructions for the order (optional)"
        specialInstructions: String
        "Optional payment method to associate when managers/admins place orders"
        paymentMethodId: ID
    }

    """
    Input for individual order items when creating an order.
    """
    input OrderItemInput {
        "ID of the menu item to order"
        menuItemId: ID!
        "Quantity of the menu item"
        quantity: Int!
        "Special notes for this item (optional)"
        notes: String
    }

    """
    Enumeration of possible order statuses throughout the order lifecycle.
    """
    enum OrderStatus {
        "Order has been placed but not yet completed"
        PENDING
        "Order has been completed and paid"
        COMPLETED
        "Order has been cancelled"
        CANCELLED
    }

    """
    Connection type for paginated orders with total count
    """
    type OrderConnection {
        "List of orders for the current page"
        orders: [Order!]!
        "Total number of orders matching the query"
        totalCount: Int!
    }

    type Query {
        """
        Get a paginated list of orders. Non-admin users can only see their own orders.
    Managers can see orders from users in their assigned restaurant.
        """
        orders(first: Int, skip: Int): OrderConnection!
        """
        Get a specific order by ID. Access control ensures users can only view their own orders
    or orders from their restaurant's members (for managers).
        """
        order(id: ID!): Order
    }

    type Mutation {
        """
        Create a new order with menu items.
    Validates menu item availability and (optionally) payment method ownership.
    All roles can create orders, but only admins/managers can attach payment methods.
        """
        createOrder(input: CreateOrderInput!): Order!
        """
        Update the status of an existing order.
        Only admins and managers can update order status.
        """
        updateOrderStatus(id: ID!, status: OrderStatus!): Order!
        """
        Cancel an existing order.
        Only admins and managers can cancel orders.
        """
        cancelOrder(id: ID!): Order!
    }
`;
