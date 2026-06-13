"""Seed data generator for Brew & Co. coffee chain demo."""
import json
import random
from datetime import datetime, timedelta
from models import db, Customer, Order

# Brew & Co. product catalog
PRODUCTS = {
    'coffee': [
        ('Espresso', 3.50), ('Cappuccino', 4.50), ('Latte', 5.00),
        ('Cold Brew', 4.75), ('Mocha', 5.50), ('Americano', 3.75),
        ('Flat White', 4.75), ('Macchiato', 4.25), ('Iced Latte', 5.25),
        ('Nitro Cold Brew', 5.75),
    ],
    'pastry': [
        ('Croissant', 3.25), ('Blueberry Muffin', 3.50), ('Banana Bread', 3.75),
        ('Chocolate Cookie', 2.50), ('Scone', 3.00), ('Cinnamon Roll', 4.25),
        ('Bagel & Cream Cheese', 4.50),
    ],
    'merch': [
        ('Brew & Co. Tumbler', 24.99), ('Coffee Bean Bag (250g)', 14.99),
        ('Brew & Co. Tote Bag', 19.99), ('French Press', 34.99),
        ('Gift Card $25', 25.00), ('Gift Card $50', 50.00),
        ('Brew & Co. Mug', 12.99),
    ],
}

CITIES = [
    'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai',
    'Pune', 'Kolkata', 'Ahmedabad', 'Jaipur', 'Goa',
]

AGE_GROUPS = ['18-24', '25-34', '35-44', '45-54', '55+']

FIRST_NAMES = [
    'Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Ayaan',
    'Krishna', 'Ishaan', 'Saanvi', 'Aanya', 'Aadhya', 'Isha', 'Ananya', 'Myra',
    'Diya', 'Priya', 'Riya', 'Anika', 'Rahul', 'Amit', 'Sneha', 'Pooja',
    'Neha', 'Kiran', 'Rohan', 'Vikram', 'Meera', 'Tanvi', 'Nisha', 'Kavya',
    'Aryan', 'Dev', 'Yash', 'Shreya', 'Simran', 'Varun', 'Raj', 'Tara',
    'Zara', 'Kabir', 'Anand', 'Divya', 'Lakshmi', 'Naveen', 'Sonia', 'Akash',
    'Maya', 'Ravi', 'Deepa', 'Suresh', 'Anjali', 'Manish', 'Swati', 'Gaurav',
]

LAST_NAMES = [
    'Sharma', 'Verma', 'Patel', 'Kumar', 'Singh', 'Gupta', 'Reddy', 'Joshi',
    'Shah', 'Mehta', 'Chopra', 'Desai', 'Nair', 'Iyer', 'Rao', 'Bhat',
    'Malhotra', 'Kapoor', 'Agarwal', 'Mishra', 'Chauhan', 'Saxena', 'Jain',
    'Banerjee', 'Mukherjee', 'Das', 'Roy', 'Chatterjee', 'Sen', 'Ghosh',
]

TAGS_POOL = [
    'coffee-lover', 'morning-regular', 'weekend-visitor', 'merch-buyer',
    'gift-card-purchaser', 'premium-drinks', 'pastry-fan', 'cold-brew-addict',
    'loyalty-member', 'new-customer', 'high-value', 'lapsed',
    'referral', 'app-user', 'sustainability-fan',
]


def generate_customers(count=500):
    """Generate realistic customer records."""
    customers = []
    used_emails = set()

    for i in range(count):
        first = random.choice(FIRST_NAMES)
        last = random.choice(LAST_NAMES)
        name = f'{first} {last}'

        # Generate unique email
        email_base = f'{first.lower()}.{last.lower()}'
        email = f'{email_base}@gmail.com'
        suffix = 1
        while email in used_emails:
            email = f'{email_base}{suffix}@gmail.com'
            suffix += 1
        used_emails.add(email)

        phone = f'+91{random.randint(7000000000, 9999999999)}'
        city = random.choice(CITIES)
        age_group = random.choices(AGE_GROUPS, weights=[20, 35, 25, 12, 8])[0]

        # Assign 1-4 random tags
        num_tags = random.randint(1, 4)
        tags = random.sample(TAGS_POOL, num_tags)

        # Created between 1-365 days ago
        days_ago = random.randint(1, 365)
        created_at = datetime.utcnow() - timedelta(days=days_ago)

        customer = Customer(
            name=name,
            email=email,
            phone=phone,
            city=city,
            age_group=age_group,
            total_spent=0.0,
            order_count=0,
            last_order_date=None,
            created_at=created_at,
            tags=json.dumps(tags),
        )
        customers.append(customer)

    return customers


def generate_orders(customers, total_orders=2000):
    """Generate realistic order data distributed across customers."""
    orders = []

    # Create a weighted distribution — some customers order a lot, most order a few
    # Power-law-ish: pick customers with replacement, weighted by "loyalty"
    loyalty_weights = []
    for c in customers:
        # Higher weight for older customers
        age_days = (datetime.utcnow() - c.created_at).days
        weight = max(1, age_days // 30)  # More months = more likely to have orders
        loyalty_weights.append(weight)

    for _ in range(total_orders):
        customer = random.choices(customers, weights=loyalty_weights, k=1)[0]

        # Order date between customer creation and now
        days_since_created = (datetime.utcnow() - customer.created_at).days
        if days_since_created <= 0:
            days_since_created = 1
        order_days_ago = random.randint(0, days_since_created)
        order_date = datetime.utcnow() - timedelta(
            days=order_days_ago,
            hours=random.randint(7, 21),  # Business hours
            minutes=random.randint(0, 59),
        )

        # Generate items (1-4 items per order)
        num_items = random.choices([1, 2, 3, 4], weights=[40, 35, 18, 7])[0]
        items = []
        total = 0.0

        for _ in range(num_items):
            category = random.choices(
                ['coffee', 'pastry', 'merch'],
                weights=[60, 30, 10]
            )[0]
            product_name, price = random.choice(PRODUCTS[category])
            items.append(product_name)
            total += price

        status = random.choices(
            ['completed', 'returned', 'cancelled'],
            weights=[90, 5, 5]
        )[0]

        order = Order(
            customer_id=None,  # Will be set after customer is committed
            order_date=order_date,
            total_amount=round(total, 2),
            items=json.dumps(items),
            status=status,
        )
        orders.append((order, customer))

    return orders


def seed_database():
    """Run the full seed process."""
    print("🌱 Seeding Brew & Co. database...")

    # Clear existing data
    Order.query.delete()
    Customer.query.delete()
    db.session.commit()
    print("  ✓ Cleared existing data")

    # Generate and insert customers
    customers = generate_customers(500)
    for c in customers:
        db.session.add(c)
    db.session.commit()
    print(f"  ✓ Created {len(customers)} customers")

    # Generate and insert orders
    order_pairs = generate_orders(customers, 2000)
    for order, customer in order_pairs:
        order.customer_id = customer.id
        db.session.add(order)
    db.session.commit()
    print(f"  ✓ Created {len(order_pairs)} orders")

    # Update customer aggregates
    for customer in customers:
        customer_orders = Order.query.filter_by(
            customer_id=customer.id,
            status='completed'
        ).all()
        customer.order_count = len(customer_orders)
        customer.total_spent = sum(o.total_amount for o in customer_orders)
        if customer_orders:
            customer.last_order_date = max(o.order_date for o in customer_orders)
    db.session.commit()
    print("  ✓ Updated customer aggregates")

    print(f"✅ Seed complete: {len(customers)} customers, {len(order_pairs)} orders")
    return len(customers), len(order_pairs)
