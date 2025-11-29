export type RestaurantPerformance = {
    restaurantId: string;
    name: string;
    city?: string | null;
    location?: string | null;
    orders: number;
    revenue: number;
    averageOrderValue: number;
};
