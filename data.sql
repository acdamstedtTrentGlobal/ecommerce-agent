USE ecommerce;

-- Categories
INSERT INTO categories (name) VALUES
('Vitamins & Minerals'),
('Sports Nutrition'),
('Heart Health'),
('Bone & Immune'),
('Digestive Health'),
('Sleep Support');

-- Products (with category_id)
INSERT INTO products (category_id, name, price, imageUrl, description, stock) VALUES
(1, 'Complete Multivitamin for Adults', 29.99, 'https://picsum.photos/id/20/300/200', 'Daily multivitamin with 25+ vitamins and minerals for overall health and wellness', 150),
(2, 'Whey Protein Isolate Powder', 49.99, 'https://picsum.photos/id/1/300/200', 'High-quality protein powder for muscle building and post-workout recovery', 100),
(3, 'Omega-3 Fish Oil Softgels', 24.99, 'https://picsum.photos/id/26/300/200', 'Heart-healthy omega-3 fatty acids EPA and DHA for cardiovascular support', 200),
(4, 'Vitamin D3 + K2 Capsules', 19.99, 'https://picsum.photos/id/96/300/200', 'Essential vitamins for bone health and immune system support', 180),
(5, 'Probiotic Gut Health Complex', 34.99, 'https://picsum.photos/id/101/300/200', '50 billion CFU probiotic blend for digestive health and immunity', 120),
(6, 'Melatonin Sleep Support Tablets', 14.99, 'https://picsum.photos/id/102/300/200', 'Natural sleep aid to help regulate sleep cycle and improve rest quality', 250);

-- Tags
INSERT INTO tags (name) VALUES
('adult'),
('multivitamin'),
('athlete'),
('protein'),
('cardio'),
('omega-3'),
('immune'),
('bone'),
('probiotic'),
('gut'),
('sleep'),
('melatonin');

-- Product-Tag associations
INSERT INTO product_tags (product_id, tag_id) VALUES
(1, 1), (1, 2),        -- Multivitamin: adult, multivitamin
(2, 3), (2, 4),        -- Whey: athlete, protein
(3, 5), (3, 6),        -- Fish Oil: cardio, omega-3
(4, 7), (4, 8),        -- D3+K2: immune, bone
(5, 9), (5, 10), (5, 7), -- Probiotic: probiotic, gut, immune
(6, 11), (6, 12);      -- Melatonin: sleep, melatonin

INSERT INTO users (name, email, password, salutation, country, role) VALUES
('Admin User', 'admin@example.com', '$2b$10$XZjZxZjZxZjZxZjZxZjZxZeXZjZxZjZxZjZxZjZxZjZxZjZxZjZxZjZ', 'Mr', 'USA', 'admin'),
('John Doe', 'john@example.com', '$2b$10$XZjZxZjZxZjZxZjZxZjZxZeXZjZxZjZxZjZxZjZxZjZxZjZxZjZxZjZ', 'Mr', 'USA', 'user'),
('Jane Smith', 'jane@example.com', '$2b$10$XZjZxZjZxZjZxZjZxZjZxZeXZjZxZjZxZjZxZjZxZjZxZjZxZjZxZjZ', 'Ms', 'UK', 'user'),
('Bob Johnson', 'bob@example.com', '$2b$10$XZjZxZjZxZjZxZjZxZjZxZeXZjZxZjZxZjZxZjZxZjZxZjZxZjZxZjZ', 'Mr', 'Canada', 'user');

INSERT INTO marketing_preferences (id, preference) VALUES
(1, 'Email Marketing'),
(2, 'SMS Marketing');

INSERT INTO user_marketing_preferences (user_id, preference_id) VALUES
(1, 1),
(1, 2),
(2, 1),
(3, 2);

INSERT INTO cart_items (user_id, product_id, quantity) VALUES
(1, 1, 2),
(1, 2, 1),
(2, 3, 3),
(3, 5, 1);

INSERT INTO orders (user_id, total, status, checkout_session_id) VALUES
(1, 109.97, 'completed', 'cs_test_1234567890'),
(2, 74.97, 'shipping', 'cs_test_0987654321'),
(3, 34.99, 'pending', 'cs_test_1122334455');

INSERT INTO order_items (order_id, product_id, quantity) VALUES
(1, 1, 2),
(1, 2, 1),
(2, 3, 3),
(3, 5, 1);
