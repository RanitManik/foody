export const typeDefs = `#graphql
    """
    Pre-defined time windows dashboards can query.
    """
    enum DashboardRangePreset {
        TODAY
        LAST_7_DAYS
        LAST_30_DAYS
        CUSTOM
    }

    """
    Optional date range input. Defaults to LAST_7_DAYS when omitted.
    """
    input DashboardRangeInput {
        preset: DashboardRangePreset
        start: DateTime
        end: DateTime
    }

    """
    Normalized range returned with every dashboard payload.
    """
    type DashboardRange {
        preset: DashboardRangePreset!
        start: DateTime!
        end: DateTime!
    }

    """
    Basic KPI descriptor for dashboard tiles.
    """
    type DashboardMetric {
        key: String!
        label: String!
        value: Decimal!
        unit: String
    }

    """
    Daily aggregated order + revenue statistics.
    """
    type DashboardTrendPoint {
        date: DateTime!
        orders: Int!
        revenue: Decimal!
    }

    """
    Aggregated performance for a restaurant across the selected range.
    """
    type DashboardRestaurantPerformance {
        restaurantId: ID!
        name: String!
        city: String
        location: String
        orders: Int!
        revenue: Decimal!
        averageOrderValue: Decimal!
    }

    """
    Payment volume per status for health widgets.
    """
    type DashboardPaymentSlice {
        status: PaymentStatus!
        count: Int!
        amount: Decimal!
    }

    """
    Lightweight feedback summary card.
    """
    type DashboardFeedbackSnippet {
        id: ID!
        message: String!
        email: String
        createdAt: DateTime!
    }

    """
    Compact representation of a recent order for timeline widgets.
    """
    type DashboardRecentOrder {
        id: ID!
        status: OrderStatus!
        totalAmount: Decimal!
        customerName: String!
        createdAt: DateTime!
    }

    """
    Menu-level performance surface for restaurants.
    """
    type DashboardMenuItemPerformance {
        menuItemId: ID!
        name: String!
        category: String
        quantity: Int!
        revenue: Decimal!
        orders: Int!
    }

    type AdminDashboardMetrics {
        range: DashboardRange!
        kpis: [DashboardMetric!]!
        orderTrend: [DashboardTrendPoint!]!
        topRestaurants: [DashboardRestaurantPerformance!]!
        paymentHealth: [DashboardPaymentSlice!]!
        recentFeedback: [DashboardFeedbackSnippet!]!
    }

    type RestaurantDashboardSummary {
        totalRevenue: Decimal!
        totalOrders: Int!
        averageOrderValue: Decimal!
        pendingOrders: Int!
        completedOrders: Int!
        failedPayments: Int!
        offlineMenuItems: Int!
    }

    type RestaurantDashboardMetrics {
        range: DashboardRange!
        summary: RestaurantDashboardSummary!
        orderTrend: [DashboardTrendPoint!]!
        paymentHealth: [DashboardPaymentSlice!]!
        topMenuItems: [DashboardMenuItemPerformance!]!
        recentOrders: [DashboardRecentOrder!]!
    }

    extend type Query {
        """Global admin-only dashboard aggregates."""
        adminDashboardMetrics(range: DashboardRangeInput): AdminDashboardMetrics!
        """Restaurant-scoped dashboard aggregates."""
        restaurantDashboardMetrics(restaurantId: ID!, range: DashboardRangeInput): RestaurantDashboardMetrics!
    }
`;
