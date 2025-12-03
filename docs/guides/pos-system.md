# POS System User Guide

## Table of Contents

- [Overview](#overview)
- [Accessing the POS System](#accessing-the-pos-system)
- [Creating a New Order](#creating-a-new-order)
    - [Step 1: Start New Order](#step-1-start-new-order)
    - [Step 2: Add Menu Items](#step-2-add-menu-items)
    - [Step 3: Order Details](#step-3-order-details)
- [Processing Payments](#processing-payments)
    - [Payment Methods](#payment-methods)
- [Order Management](#order-management)
- [Reporting and Analytics](#reporting-and-analytics)
- [Troubleshooting](#troubleshooting)

This guide explains how to use the Point of Sale (POS) system in Foody for creating and managing restaurant orders.

## Overview

The POS system provides an intuitive interface for restaurant staff to:

- Create new orders
- Add menu items to orders
- Process payments
- Track order status
- Manage order history

## Accessing the POS System

1. **Login** to Foody with your staff account (Manager or Member role)
2. **Navigate** to the POS/Order section from the main menu
3. **Select Restaurant** (if you have access to multiple locations)

## Creating a New Order

### Step 1: Start New Order

1. Click **"New Order"** button
2. The system creates a new order in PENDING status
3. Order details panel opens on the right

### Step 2: Add Menu Items

1. **Browse Menu Categories** on the left panel
2. **Click Menu Items** to add them to the order
3. **Specify Quantity** using the +/- buttons
4. **Add Special Instructions** for individual items if needed

### Step 3: Order Details

- **View Order Summary** in the right panel
- **See Running Total** updated in real-time
- **Add Order Notes** for special instructions
- **Specify Phone Number** for order tracking

## Processing Payments

### Payment Methods

Foody supports multiple payment methods:

- **Credit Card** (Visa, MasterCard, American Express)
- **Debit Card**
- **PayPal**
- **Apple Pay / Google Pay**
- **Cash** (in-person payments)

### Processing a Payment

1. **Review Order Total** in the order summary
2. **Select Payment Method** from available options
3. **Enter Payment Details** (card info, PayPal login, etc.)
4. **Click "Process Payment"**
5. **Confirm Payment** - system updates order status to COMPLETED

### Payment Status

- **PENDING**: Payment initiated
- **PROCESSING**: Payment being processed
- **COMPLETED**: Payment successful, order fulfilled
- **FAILED**: Payment failed, order remains pending
- **REFUNDED**: Payment refunded

## Order Management

### Viewing Orders

- **Active Orders**: Currently being processed
- **Order History**: Past orders with search/filter options
- **Order Details**: Click any order to view full details

### Order Status Workflow

```
PENDING → COMPLETED
    ↓
CANCELLED
```

### Updating Order Status

**Managers and Members can:**

- ✅ Create orders
- ✅ Process payments (complete orders)
- ❌ Cancel orders (Manager only)

### Cancelling Orders

1. **Open Order Details**
2. **Click "Cancel Order"** (Manager only)
3. **Provide Cancellation Reason**
4. **Confirm Cancellation**

## Real-time Updates

The POS system provides real-time updates:

- **Order Status Changes**: Automatic updates when payments complete
- **New Orders**: Notifications for new orders (if enabled)
- **Payment Confirmations**: Instant feedback on payment processing

## Best Practices

### Order Creation

- **Verify Customer Information**: Ensure phone number is correct for order tracking
- **Check Menu Availability**: Confirm items are in stock before adding
- **Add Clear Instructions**: Use order notes for special requests
- **Double-check Totals**: Verify order total before payment

### Payment Processing

- **Secure Card Handling**: Never store card details manually
- **Verify Payment Amounts**: Ensure payment matches order total
- **Handle Declines Gracefully**: Have backup payment methods ready
- **Provide Receipts**: System generates digital receipts automatically

### Customer Service

- **Quick Processing**: Aim to complete orders within 2-3 minutes
- **Clear Communication**: Explain wait times and order status
- **Handle Issues**: Be prepared to cancel and reprocess orders if needed
- **Follow Up**: Use phone number for order status updates

## Troubleshooting

### Common Issues

**Payment Declines:**

- Check card details
- Verify sufficient funds
- Try alternative payment method
- Contact payment processor if issue persists

**Menu Item Unavailable:**

- Mark item as unavailable in menu management
- Inform customer of alternatives
- Update inventory if applicable

**System Slow/Unresponsive:**

- Check internet connection
- Refresh the page
- Clear browser cache
- Contact technical support

### Error Messages

**"Restaurant Access Denied":**

- You don't have permission for this restaurant
- Contact your administrator

**"Payment Method Unavailable":**

- Selected payment method not configured
- Choose different payment method
- Contact administrator to set up payment method

**"Order Already Processed":**

- Order status changed by another user
- Refresh order list
- Check order history

## Keyboard Shortcuts

- **Ctrl+N**: New order
- **Ctrl+S**: Save order (if draft mode available)
- **Ctrl+P**: Process payment
- **Esc**: Cancel current operation
- **Arrow Keys**: Navigate menu items

## Mobile/Tablet Usage

The POS system is optimized for tablets:

- **Touch-friendly Interface**: Large buttons and touch targets
- **Responsive Design**: Adapts to different screen sizes
- **Gesture Support**: Swipe gestures for navigation
- **Offline Mode**: Basic functionality when internet is unavailable

## Reporting and Analytics

Access order reports from the Reports section:

- **Daily Sales**: Total sales by day
- **Popular Items**: Best-selling menu items
- **Payment Methods**: Breakdown by payment type
- **Order Volume**: Number of orders over time

## Support

For technical issues or questions:

- **In-app Help**: Click the ? icon for context-sensitive help
- **User Manual**: Access full documentation from Help menu
- **Support Ticket**: Submit issues through the Support section
- **Training**: Contact your manager for additional training

## Security Notes

- **Session Timeout**: System logs out after 30 minutes of inactivity
- **Role-based Access**: Actions limited by your permission level
- **Audit Trail**: All actions are logged for security and compliance
- **Data Privacy**: Customer information handled according to privacy policies
