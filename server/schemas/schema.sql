CREATE DATABASE IF NOT EXISTS suvidha;
USE suvidha;

-- ===========================
-- USERS TABLE
-- ===========================
CREATE TABLE users (
    user_id CHAR(11) PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    mobile CHAR(10) UNIQUE NOT NULL,
    aadhar_hash CHAR(64) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    language_preference VARCHAR(50) DEFAULT 'English',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===========================
-- ADMINS TABLE
-- ===========================
CREATE TABLE admins (
    admin_id CHAR(9) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    mobile CHAR(10),
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'super_admin', 'department_admin') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===========================
-- DEPARTMENTS TABLE
-- ===========================
CREATE TABLE departments (
    dept_id CHAR(13) PRIMARY KEY,
    dept_name VARCHAR(100) NOT NULL,
    office_location VARCHAR(200),
    contact_email VARCHAR(100),
    contact_phone CHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===========================
-- ADMIN-DEPARTMENT MAPPING
-- ===========================
CREATE TABLE admin_departments (
    admin_id CHAR(9) NOT NULL,
    dept_id CHAR(13) NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (admin_id, dept_id),
    FOREIGN KEY (admin_id) REFERENCES admins(admin_id) ON DELETE CASCADE,
    FOREIGN KEY (dept_id) REFERENCES departments(dept_id) ON DELETE CASCADE
);

-- ===========================
-- SERVICES TABLE
-- ===========================
CREATE TABLE services (
    service_id CHAR(25) PRIMARY KEY,
    dept_id CHAR(13) NOT NULL,
    service_name VARCHAR(100) NOT NULL,
    service_type ENUM('Payable', 'Non-Payable') NOT NULL,
    description TEXT,
    fee DECIMAL(10,2) DEFAULT 0.00,
    processing_time_days INT DEFAULT 7,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (dept_id) REFERENCES departments(dept_id) ON DELETE CASCADE
);

-- ===========================
-- REQUESTS TABLE
-- ===========================
CREATE TABLE requests (
    request_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id CHAR(11) NOT NULL,
    service_id CHAR(25) NOT NULL,
    request_type ENUM('Request', 'Complaint') NOT NULL,
    description TEXT,
    status ENUM('Pending', 'In Progress', 'Completed', 'Rejected', 'Cancelled') DEFAULT 'Pending',
    assigned_to CHAR(9),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (service_id) REFERENCES services(service_id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_to) REFERENCES admins(admin_id) ON DELETE SET NULL
);

-- ===========================
-- REQUEST STATUS HISTORY
-- ===========================
CREATE TABLE request_status_history (
    history_id INT AUTO_INCREMENT PRIMARY KEY,
    request_id INT NOT NULL,
    old_status VARCHAR(30),
    new_status VARCHAR(30) NOT NULL,
    changed_by CHAR(9),
    remarks TEXT,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (request_id) REFERENCES requests(request_id) ON DELETE CASCADE,
    FOREIGN KEY (changed_by) REFERENCES admins(admin_id) ON DELETE SET NULL
);

-- ===========================
-- PAYMENTS TABLE
-- ===========================
CREATE TABLE payments (
    payment_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id CHAR(11) NOT NULL,
    service_id CHAR(25) NOT NULL,
    request_id INT,
    amount DECIMAL(10,2) NOT NULL,
    transaction_ref VARCHAR(100) UNIQUE,
    payment_method ENUM('UPI', 'Card', 'Net Banking', 'Cash') DEFAULT 'UPI',
    payment_status ENUM('Pending', 'Success', 'Failed', 'Refunded') DEFAULT 'Pending',
    paid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (service_id) REFERENCES services(service_id) ON DELETE CASCADE,
    FOREIGN KEY (request_id) REFERENCES requests(request_id) ON DELETE SET NULL
);

-- ===========================
-- DOCUMENTS TABLE
-- ===========================
CREATE TABLE documents (
    document_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id CHAR(11) NOT NULL,
    request_id INT,
    document_type VARCHAR(50) NOT NULL,
    document_number VARCHAR(50),
    file_path TEXT NOT NULL,
    file_size INT,
    verified_status BOOLEAN DEFAULT FALSE,
    verified_by VARCHAR(20),
    verified_at TIMESTAMP NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (request_id) REFERENCES requests(request_id) ON DELETE CASCADE,
    FOREIGN KEY (verified_by) REFERENCES admins(admin_id) ON DELETE SET NULL
);

-- ===========================
-- NOTIFICATIONS TABLE
-- ===========================
CREATE TABLE notifications (
    notification_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id CHAR(11) NOT NULL,
    title VARCHAR(200),
    message TEXT NOT NULL,
    notification_type ENUM('Info', 'Alert', 'Success', 'Warning') DEFAULT 'Info',
    status ENUM('Unread', 'Read') DEFAULT 'Unread',
    sent_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- ===========================
-- SESSIONS TABLE
-- ===========================
CREATE TABLE sessions (
    session_id VARCHAR(255) PRIMARY KEY,
    user_id CHAR(11) NOT NULL,
    user_type ENUM('user', 'admin') NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    logout_time TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- ===========================
-- FEEDBACK TABLE
-- ===========================
CREATE TABLE feedback (
    feedback_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id CHAR(11) NOT NULL,
    service_id CHAR(25) NOT NULL,
    request_id INT,
    rating INT CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (service_id) REFERENCES services(service_id) ON DELETE CASCADE,
    FOREIGN KEY (request_id) REFERENCES requests(request_id) ON DELETE SET NULL
);

-- ===========================
-- AUDIT LOGS TABLE
-- ===========================
CREATE TABLE audit_logs (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INT,
    action ENUM('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT') NOT NULL,
    performed_by VARCHAR(50) NOT NULL,
    performed_by_type ENUM('user', 'admin') NOT NULL,
    old_values JSON,
    new_values JSON,
    ip_address VARCHAR(45),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_entity (entity_type, entity_id),
    INDEX idx_performed_by (performed_by),
    INDEX idx_timestamp (timestamp)
);

-- ===========================
-- INDEXES FOR PERFORMANCE
-- ===========================
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_mobile ON users(mobile);
CREATE INDEX idx_admins_email ON admins(email);
CREATE INDEX idx_requests_user ON requests(user_id);
CREATE INDEX idx_requests_status ON requests(status);
CREATE INDEX idx_requests_created ON requests(created_at);
CREATE INDEX idx_payments_user ON payments(user_id);
CREATE INDEX idx_payments_status ON payments(payment_status);
CREATE INDEX idx_documents_user ON documents(user_id);
CREATE INDEX idx_notifications_user ON notifications(user_id, status);
CREATE INDEX idx_sessions_user ON sessions(user_id, is_active);