CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(10) UNIQUE,
  password VARCHAR(255),
  role ENUM('user', 'admin') NOT NULL DEFAULT 'user',
  is_phone_verified TINYINT(1) NOT NULL DEFAULT 0,
  is_email_verified TINYINT(1) NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  otp VARCHAR(10),
  otp_expire DATETIME,
  reset_password_token VARCHAR(255),
  reset_password_expire DATETIME,
  profile_picture VARCHAR(500),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_addresses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(10) NOT NULL,
  line1 VARCHAR(255) NOT NULL,
  line2 VARCHAR(255),
  city VARCHAR(100) NOT NULL,
  state VARCHAR(100) NOT NULL,
  pincode VARCHAR(6) NOT NULL,
  is_default TINYINT(1) NOT NULL DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  variety ENUM(
    'Classic White Formal',
    'Oxford Button-Down',
    'Slim Fit Solid',
    'Casual Linen',
    'Printed Heritage'
  ) NOT NULL,
  description TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  discounted_price DECIMAL(10, 2),
  fabric VARCHAR(255),
  fit ENUM('Regular', 'Slim', 'Relaxed', 'Oversized'),
  color VARCHAR(100),
  care JSON,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  is_featured TINYINT(1) NOT NULL DEFAULT 0,
  ratings DECIMAL(3, 2) NOT NULL DEFAULT 0,
  num_reviews INT NOT NULL DEFAULT 0,
  tags JSON,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS product_images (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  url VARCHAR(500) NOT NULL,
  public_id VARCHAR(255),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS product_sizes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  size ENUM('M', 'L', 'XL', 'XXL') NOT NULL,
  stock INT NOT NULL DEFAULT 0,
  UNIQUE KEY unique_product_size (product_id, size),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id VARCHAR(50) NOT NULL UNIQUE,
  user_id INT NOT NULL,
  shipping_name VARCHAR(100) NOT NULL,
  shipping_phone VARCHAR(10) NOT NULL,
  shipping_line1 VARCHAR(255) NOT NULL,
  shipping_line2 VARCHAR(255),
  shipping_city VARCHAR(100) NOT NULL,
  shipping_state VARCHAR(100) NOT NULL,
  shipping_pincode VARCHAR(6) NOT NULL,
  items_price DECIMAL(10, 2) NOT NULL,
  shipping_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  tax_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(10, 2) NOT NULL,
  payment_method ENUM('UPI', 'Card', 'NetBanking', 'Wallet', 'COD', 'RAZORPAY') NOT NULL DEFAULT 'UPI',
  razorpay_order_id VARCHAR(255),
  razorpay_payment_id VARCHAR(255),
  razorpay_signature VARCHAR(255),
  payment_status ENUM('pending', 'paid', 'failed', 'refunded') NOT NULL DEFAULT 'pending',
  paid_at DATETIME,
  order_status ENUM(
    'placed', 'confirmed', 'processing', 'shipped',
    'out_for_delivery', 'delivered', 'cancelled',
    'return_requested', 'returned'
  ) NOT NULL DEFAULT 'placed',
  delivered_at DATETIME,
  estimated_delivery DATETIME,
  cancellation_reason TEXT,
  notes TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  image VARCHAR(500),
  size VARCHAR(10) NOT NULL,
  quantity INT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE IF NOT EXISTS order_tracking (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  status VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  location VARCHAR(255),
  tracked_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);
