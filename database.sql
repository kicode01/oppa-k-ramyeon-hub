-- database.sql
-- (Removed CREATE DATABASE and USE statements for InfinityFree compatibility)

CREATE TABLE IF NOT EXISTS menu_items (
    id VARCHAR(50) PRIMARY KEY,
    category ENUM('noodles', 'streetFoods', 'bingsu', 'drinks', 'snacks') NOT NULL,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    image VARCHAR(500) DEFAULT '',
    description TEXT,
    tags VARCHAR(255) DEFAULT ''
);

CREATE TABLE IF NOT EXISTS toppings (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    image VARCHAR(500) DEFAULT ''
);

CREATE TABLE IF NOT EXISTS reservations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    party_size INT NOT NULL,
    res_date DATE NOT NULL,
    res_time VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'confirmed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

TRUNCATE TABLE menu_items;
TRUNCATE TABLE toppings;

-- Baseline data (Admins can add more later)
INSERT INTO menu_items (id, category, name, price, image, description, tags) VALUES
('n1', 'noodles', 'Samyang Buldak Original', 150.00, 'https://images.unsplash.com/photo-1612929633738-8fe01f7280c2?q=80&w=600&auto=format&fit=crop', 'The classic fire noodle challenge.', 'trending,spicy'),
('n2', 'noodles', 'Shin Ramyun Black', 160.00, 'https://images.unsplash.com/photo-1552611052-33e04de081de?q=80&w=600&auto=format&fit=crop', 'Premium spicy beef broth.', 'classic'),
('s1', 'streetFoods', 'Kimbap', 120.00, 'https://images.unsplash.com/photo-1580651315530-69c8e0026377?q=80&w=600&auto=format&fit=crop', 'Classic Korean seaweed rice roll.', ''),
('s2', 'streetFoods', 'Odeng (Fish Cake)', 80.00, 'https://images.unsplash.com/photo-1548943487-a2e4e43b4859?q=80&w=600&auto=format&fit=crop', 'Warm fish cake skewers.', 'trending'),
('b1', 'bingsu', 'Mango Halo Bingsu', 220.00, 'https://images.unsplash.com/photo-1556698696-6d6f9b1f0714?q=80&w=600&auto=format&fit=crop', 'Shaved ice topped with fresh mangoes.', 'trending'),
('d1', 'drinks', 'Binggrae Banana Milk', 70.00, 'https://images.unsplash.com/photo-1550583724-b2692b85b150?q=80&w=600&auto=format&fit=crop', 'Iconic Korean banana milk.', 'classic'),
('sn1', 'snacks', 'Melona Ice Cream Bar', 60.00, 'https://images.unsplash.com/photo-1557142046-c704a3adf364?q=80&w=600&auto=format&fit=crop', 'Honeydew melon flavored ice bar.', 'classic');

INSERT INTO toppings (id, name, price, image) VALUES
('t1', 'Soft Boiled Egg', 20.00, 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?q=80&w=150&auto=format&fit=crop'),
('t2', 'Mozzarella Cheese', 30.00, 'https://images.unsplash.com/photo-1631379578550-7038263db699?q=80&w=150&auto=format&fit=crop');
-- 1. Create the receipts table
CREATE TABLE IF NOT EXISTS receipts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    receipt_code VARCHAR(255) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    points_earned INT NOT NULL,
    cart_data JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Add missing columns to the users table (MariaDB/MySQL safe way)
-- We will just ensure users is created if it didn't exist
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'customer') NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    passport_points INT DEFAULT 0,
    bowls_redeemed INT DEFAULT 0,
    is_verified TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Note: We assume ALTERs were handled by the patch. If users table already exists, the CREATE TABLE IF NOT EXISTS won't do anything.
