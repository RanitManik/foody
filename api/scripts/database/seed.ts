import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import cliProgress from "cli-progress";

const prisma = new PrismaClient();

const DEFAULT_PASSWORD = "ChangeMe123!";

const LOCATIONS = {
    SPICE_GARDEN: "spice-garden-bangalore",
    TANDOOR_EXPRESS: "tandoor-express-bangalore",
    BURGER_HAVEN: "burger-haven-new-york",
    PIZZA_PALACE: "pizza-palace-new-york",
} as const;

const RESTAURANT_IDS = {
    SPICE_GARDEN: "restaurant-india-1",
    TANDOOR_EXPRESS: "restaurant-india-2",
    BURGER_HAVEN: "restaurant-america-1",
    PIZZA_PALACE: "restaurant-america-2",
} as const;

async function main() {
    console.log("🌱 Starting database seeding...");
    console.log(`🔐 Using default password: ${DEFAULT_PASSWORD}`);
    console.log("📝 Users can change their passwords after first login\n");

    const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 12);

    // Collect status messages to display after progress bars
    const statusMessages: string[] = [];

    // Create progress bars
    const multibar = new cliProgress.MultiBar(
        {
            clearOnComplete: false,
            hideCursor: true,
            format: "{bar} {percentage}% | {value}/{total} | {task}",
        },
        cliProgress.Presets.shades_classic,
    );

    // Progress bars for each major step
    const restaurantBar = multibar.create(4, 0, { task: "Restaurants" });
    const userBar = multibar.create(256, 0, { task: "Users" });
    const menuBar = multibar.create(200, 0, { task: "Menu Items" });
    const orderBar = multibar.create(200, 0, { task: "Orders" });
    const paymentBar = multibar.create(200, 0, { task: "Payment Methods" });

    const restaurantIndia1 = await prisma.restaurants.upsert({
        where: { id: RESTAURANT_IDS.SPICE_GARDEN },
        update: {},
        create: {
            id: RESTAURANT_IDS.SPICE_GARDEN,
            name: "Spice Garden",
            description: "Authentic Indian cuisine with modern twist",
            address: "123 MG Road, Bangalore",
            city: "Bangalore",
            location: LOCATIONS.SPICE_GARDEN,
            phone: "+91-9876543210",
            email: "info@spicegarden.in",
        },
    });
    restaurantBar.update(1);

    const restaurantIndia2 = await prisma.restaurants.upsert({
        where: { id: RESTAURANT_IDS.TANDOOR_EXPRESS },
        update: {},
        create: {
            id: RESTAURANT_IDS.TANDOOR_EXPRESS,
            name: "Tandoor Express",
            description: "Traditional North Indian delicacies",
            address: "456 Brigade Road, Bangalore",
            city: "Bangalore",
            location: LOCATIONS.TANDOOR_EXPRESS,
            phone: "+91-9876543211",
            email: "contact@tandoorexpress.in",
        },
    });
    restaurantBar.update(2);

    const restaurantAmerica1 = await prisma.restaurants.upsert({
        where: { id: RESTAURANT_IDS.BURGER_HAVEN },
        update: {},
        create: {
            id: RESTAURANT_IDS.BURGER_HAVEN,
            name: "Burger Haven",
            description: "Classic American burgers and fries",
            address: "789 Main Street, New York",
            city: "New York",
            location: LOCATIONS.BURGER_HAVEN,
            phone: "+1-555-0123",
            email: "hello@burgerhaven.us",
        },
    });
    restaurantBar.update(3);

    const restaurantAmerica2 = await prisma.restaurants.upsert({
        where: { id: RESTAURANT_IDS.PIZZA_PALACE },
        update: {},
        create: {
            id: RESTAURANT_IDS.PIZZA_PALACE,
            name: "Pizza Palace",
            description: "Wood-fired pizzas with fresh ingredients",
            address: "321 Broadway, New York",
            city: "New York",
            location: LOCATIONS.PIZZA_PALACE,
            phone: "+1-555-0124",
            email: "orders@pizzapalace.us",
        },
    });
    restaurantBar.update(4);
    restaurantBar.stop();

    statusMessages.push("✅ Restaurants ready");

    const restaurants = [
        restaurantIndia1,
        restaurantIndia2,
        restaurantAmerica1,
        restaurantAmerica2,
    ];

    // Create users
    const users = [];

    // Admin user
    const admin = await prisma.users.upsert({
        where: { email: "admin@foody.com" },
        update: {},
        create: {
            email: "admin@foody.com",
            password: hashedPassword,
            firstName: "Nick",
            lastName: "Fury",
            role: UserRole.ADMIN,
            restaurantId: null,
        },
    });
    users.push(admin);
    userBar.update(1);

    statusMessages.push(`✅ Admin user created: admin@foody.com / ${DEFAULT_PASSWORD}`);

    // Create managers
    const manager1 = await prisma.users.upsert({
        where: { email: "captain.marvel@foody.com" },
        update: {},
        create: {
            email: "captain.marvel@foody.com",
            password: hashedPassword,
            firstName: "Captain",
            lastName: "Marvel",
            role: UserRole.MANAGER,
            restaurantId: restaurantIndia1.id,
        },
    });
    users.push(manager1);
    userBar.update(2);

    const manager2 = await prisma.users.upsert({
        where: { email: "captain.america@foody.com" },
        update: {},
        create: {
            email: "captain.america@foody.com",
            password: hashedPassword,
            firstName: "Captain",
            lastName: "America",
            role: UserRole.MANAGER,
            restaurantId: restaurantAmerica1.id,
        },
    });
    users.push(manager2);
    userBar.update(3);

    // Create team members (50 per restaurant = 200)
    for (const restaurant of restaurants) {
        for (let i = 1; i <= 50; i++) {
            const member = await prisma.users.upsert({
                where: { email: `member-${restaurant.id}-${i}@foody.com` },
                update: {},
                create: {
                    email: `member-${restaurant.id}-${i}@foody.com`,
                    password: hashedPassword,
                    firstName: `Member${i}`,
                    lastName: `Of${restaurant.name.replace(/\s+/g, "")}`,
                    role: UserRole.MEMBER,
                    restaurantId: restaurant.id,
                },
            });
            users.push(member);
            userBar.update(users.length);
        }
    }
    statusMessages.push("✅ 200 staff members created (50 per restaurant)");

    // Additional users (members) - 50 more
    for (let i = 1; i <= 50; i++) {
        const user = await prisma.users.upsert({
            where: { email: `member${i}@foody.com` },
            update: {},
            create: {
                email: `member${i}@foody.com`,
                password: hashedPassword,
                firstName: `Member${i}`,
                lastName: `Test`,
                role: UserRole.MEMBER,
                restaurantId: null,
            },
        });
        users.push(user);
        userBar.update(users.length);
    }

    statusMessages.push(`✅ 50 additional members created`);
    statusMessages.push(`✅ Total 256 users created`);

    // Create specific test users for documentation
    const thanos = await prisma.users.upsert({
        where: { email: "thanos@foody.com" },
        update: {},
        create: {
            email: "thanos@foody.com",
            password: hashedPassword,
            firstName: "Thanos",
            lastName: "Test",
            role: UserRole.MEMBER,
            restaurantId: restaurantIndia1.id,
        },
    });
    users.push(thanos);

    const thor = await prisma.users.upsert({
        where: { email: "thor@foody.com" },
        update: {},
        create: {
            email: "thor@foody.com",
            password: hashedPassword,
            firstName: "Thor",
            lastName: "Test",
            role: UserRole.MEMBER,
            restaurantId: restaurantIndia2.id,
        },
    });
    users.push(thor);

    const travis = await prisma.users.upsert({
        where: { email: "travis@foody.com" },
        update: {},
        create: {
            email: "travis@foody.com",
            password: hashedPassword,
            firstName: "Travis",
            lastName: "Test",
            role: UserRole.MEMBER,
            restaurantId: restaurantAmerica1.id,
        },
    });
    users.push(travis);

    userBar.stop();

    // Create menu items (50 per restaurant = 200)
    const menuItems = [];
    for (const restaurant of restaurants) {
        for (let i = 1; i <= 50; i++) {
            const menuItem = await prisma.menu_items.upsert({
                where: { id: `menu-${restaurant.id}-${i}` },
                update: {},
                create: {
                    id: `menu-${restaurant.id}-${i}`,
                    name: `Menu Item ${i} at ${restaurant.name}`,
                    description: `Description for menu item ${i} at ${restaurant.name}`,
                    price: 10 + (i % 10),
                    category: "Main Course",
                    restaurantId: restaurant.id,
                },
            });
            menuItems.push(menuItem);
            menuBar.update(menuItems.length);
        }
    }
    statusMessages.push("✅ 200 menu items created (50 per restaurant)");
    menuBar.stop();

    // Create orders (50 per restaurant = 200)
    for (const restaurant of restaurants) {
        for (let i = 1; i <= 50; i++) {
            const user = users[Math.floor(Math.random() * users.length)];
            const availableItems = menuItems.filter((m) => m.restaurantId === restaurant.id);
            const numItems = Math.floor(Math.random() * 3) + 1;
            const selectedItems = [];
            let total = 0;
            for (let j = 0; j < numItems; j++) {
                const item = availableItems[Math.floor(Math.random() * availableItems.length)];
                selectedItems.push(item);
                total += item.price;
            }
            const order = await prisma.orders.create({
                data: {
                    userId: user.id,
                    restaurantId: restaurant.id,
                    totalAmount: total,
                    status: "COMPLETED",
                    phone: "+1234567890",
                },
            });
            for (const item of selectedItems) {
                await prisma.order_items.create({
                    data: {
                        orderId: order.id,
                        menuItemId: item.id,
                        quantity: 1,
                        price: item.price,
                    },
                });
            }
            orderBar.update(restaurants.indexOf(restaurant) * 50 + i);
        }
    }
    statusMessages.push("✅ 200 orders created (50 per restaurant)");
    orderBar.stop();

    // Create payment methods (50 per restaurant = 200)
    for (const restaurant of restaurants) {
        for (let i = 1; i <= 50; i++) {
            await prisma.payment_methods.create({
                data: {
                    restaurantId: restaurant.id,
                    type: "CREDIT_CARD",
                    provider: "STRIPE",
                    last4: `${i % 10}${i % 10}${i % 10}${i % 10}`,
                    isDefault: i === 1,
                },
            });
            paymentBar.update(restaurants.indexOf(restaurant) * 50 + i);
        }
    }
    statusMessages.push("✅ 200 payment methods created (50 per restaurant)");
    paymentBar.stop();

    multibar.stop();

    // Print all status messages after progress bars are complete
    console.log("\n" + statusMessages.join("\n"));

    console.log("\n🎉 Database seeding completed successfully!");
    console.log("\n📋 Test Accounts (All passwords: ChangeMe123!):");
    console.log("Admin: admin@foody.com");
    console.log(
        `Manager (Spice Garden): captain.marvel@foody.com → ${restaurantIndia1.id} (${restaurantIndia1.location})`,
    );
    console.log(
        `Manager (Burger Haven): captain.america@foody.com → ${restaurantAmerica1.id} (${restaurantAmerica1.location})`,
    );
    console.log(
        `Member (Spice Garden): thanos@foody.com → ${restaurantIndia1.id} (${restaurantIndia1.location})`,
    );
    console.log(
        `Member (Tandoor Express): thor@foody.com → ${restaurantIndia2.id} (${restaurantIndia2.location})`,
    );
    console.log(
        `Member (Burger Haven): travis@foody.com → ${restaurantAmerica1.id} (${restaurantAmerica1.location})`,
    );
}

main()
    .catch((e) => {
        console.error("❌ Seeding failed:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
