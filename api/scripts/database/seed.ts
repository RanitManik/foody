import { PrismaClient, UserRole, Country } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEFAULT_PASSWORD = "ChangeMe123!";

async function main() {
    console.log("🌱 Starting database seeding...");
    console.log(`🔐 Using default password: ${DEFAULT_PASSWORD}`);
    console.log("📝 Users can change their passwords after first login");

    // Create admin user
    const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 12);
    await prisma.users.upsert({
        where: { email: "admin@foody.com" },
        update: {},
        create: {
            email: "admin@foody.com",
            password: hashedPassword,
            firstName: "Nick",
            lastName: "Fury",
            role: UserRole.ADMIN,
        },
    });

    console.log(`✅ Admin user created: admin@foody.com / ${DEFAULT_PASSWORD}`);

    // Create managers
    await prisma.users.upsert({
        where: { email: "captain.marvel@foody.com" },
        update: {},
        create: {
            email: "captain.marvel@foody.com",
            password: hashedPassword,
            firstName: "Captain",
            lastName: "Marvel",
            role: UserRole.MANAGER_INDIA,
            country: Country.INDIA,
        },
    });

    await prisma.users.upsert({
        where: { email: "captain.america@foody.com" },
        update: {},
        create: {
            email: "captain.america@foody.com",
            password: hashedPassword,
            firstName: "Captain",
            lastName: "America",
            role: UserRole.MANAGER_AMERICA,
            country: Country.AMERICA,
        },
    });

    // Create team members
    await prisma.users.upsert({
        where: { email: "thanos@foody.com" },
        update: {},
        create: {
            email: "thanos@foody.com",
            password: hashedPassword,
            firstName: "Thanos",
            lastName: "Titan",
            role: UserRole.MEMBER_INDIA,
            country: Country.INDIA,
        },
    });

    await prisma.users.upsert({
        where: { email: "thor@foody.com" },
        update: {},
        create: {
            email: "thor@foody.com",
            password: hashedPassword,
            firstName: "Thor",
            lastName: "Odinson",
            role: UserRole.MEMBER_INDIA,
            country: Country.INDIA,
        },
    });

    await prisma.users.upsert({
        where: { email: "travis@foody.com" },
        update: {},
        create: {
            email: "travis@foody.com",
            password: hashedPassword,
            firstName: "Travis",
            lastName: "Scott",
            role: UserRole.MEMBER_AMERICA,
            country: Country.AMERICA,
        },
    });

    // Create restaurants
    const restaurantIndia1 = await prisma.restaurants.upsert({
        where: { id: "restaurant-india-1" },
        update: {},
        create: {
            id: "restaurant-india-1",
            name: "Spice Garden",
            description: "Authentic Indian cuisine with modern twist",
            address: "123 MG Road, Bangalore",
            city: "Bangalore",
            country: Country.INDIA,
            phone: "+91-9876543210",
            email: "info@spicegarden.in",
        },
    });

    const restaurantIndia2 = await prisma.restaurants.upsert({
        where: { id: "restaurant-india-2" },
        update: {},
        create: {
            id: "restaurant-india-2",
            name: "Tandoor Express",
            description: "Traditional North Indian delicacies",
            address: "456 Brigade Road, Bangalore",
            city: "Bangalore",
            country: Country.INDIA,
            phone: "+91-9876543211",
            email: "contact@tandoorexpress.in",
        },
    });

    const restaurantAmerica1 = await prisma.restaurants.upsert({
        where: { id: "restaurant-america-1" },
        update: {},
        create: {
            id: "restaurant-america-1",
            name: "Burger Haven",
            description: "Classic American burgers and fries",
            address: "789 Main Street, New York",
            city: "New York",
            country: Country.AMERICA,
            phone: "+1-555-0123",
            email: "hello@burgerhaven.us",
        },
    });

    const restaurantAmerica2 = await prisma.restaurants.upsert({
        where: { id: "restaurant-america-2" },
        update: {},
        create: {
            id: "restaurant-america-2",
            name: "Pizza Palace",
            description: "Wood-fired pizzas with fresh ingredients",
            address: "321 Broadway, New York",
            city: "New York",
            country: Country.AMERICA,
            phone: "+1-555-0124",
            email: "orders@pizzapalace.us",
        },
    });

    // Create menu items for Indian restaurants
    await prisma.menu_items.upsert({
        where: { id: "menu-india-1-1" },
        update: {},
        create: {
            id: "menu-india-1-1",
            name: "Butter Chicken",
            description: "Creamy tomato-based curry with tender chicken",
            price: 15.99,
            category: "Main Course",
            restaurantId: restaurantIndia1.id,
        },
    });

    await prisma.menu_items.upsert({
        where: { id: "menu-india-1-2" },
        update: {},
        create: {
            id: "menu-india-1-2",
            name: "Paneer Tikka",
            description: "Marinated cottage cheese grilled to perfection",
            price: 12.99,
            category: "Appetizer",
            restaurantId: restaurantIndia1.id,
        },
    });

    await prisma.menu_items.upsert({
        where: { id: "menu-india-2-1" },
        update: {},
        create: {
            id: "menu-india-2-1",
            name: "Chicken Biryani",
            description: "Fragrant basmati rice with spiced chicken",
            price: 14.99,
            category: "Main Course",
            restaurantId: restaurantIndia2.id,
        },
    });

    // Create menu items for American restaurants
    await prisma.menu_items.upsert({
        where: { id: "menu-america-1-1" },
        update: {},
        create: {
            id: "menu-america-1-1",
            name: "Classic Cheeseburger",
            description: "Juicy beef patty with cheese, lettuce, and tomato",
            price: 12.99,
            category: "Main Course",
            restaurantId: restaurantAmerica1.id,
        },
    });

    await prisma.menu_items.upsert({
        where: { id: "menu-america-1-2" },
        update: {},
        create: {
            id: "menu-america-1-2",
            name: "French Fries",
            description: "Crispy golden fries with sea salt",
            price: 4.99,
            category: "Side",
            restaurantId: restaurantAmerica1.id,
        },
    });

    await prisma.menu_items.upsert({
        where: { id: "menu-america-2-1" },
        update: {},
        create: {
            id: "menu-america-2-1",
            name: "Margherita Pizza",
            description: "Fresh mozzarella, tomato sauce, and basil",
            price: 16.99,
            category: "Main Course",
            restaurantId: restaurantAmerica2.id,
        },
    });

    console.log("✅ Database seeding completed!");
    console.log("\n📋 Test Accounts (All passwords: ChangeMe123!):");
    console.log("Admin: admin@foody.com");
    console.log("Manager India: captain.marvel@foody.com");
    console.log("Manager America: captain.america@foody.com");
    console.log("Member India 1: thanos@foody.com");
    console.log("Member India 2: thor@foody.com");
    console.log("Member America: travis@foody.com");
}

main()
    .catch((e) => {
        console.error("❌ Seeding failed:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
