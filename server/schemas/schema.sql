CREATE DATABASE IF NOT EXISTS suvidha;
USE suvidha;

CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    mobile CHAR(10) UNIQUE,
    aadhar_hash CHAR(12) UNIQUE,
    email VARCHAR(100) UNIQUE,
    password VARCHAR(255) NOT NULL,
    language_preference VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE admins (
    admin_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(100) UNIQUE,
    password VARCHAR(255),
    role VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE departments (
    dept_id INT AUTO_INCREMENT PRIMARY KEY,
    dept_name VARCHAR(100),
    office_location VARCHAR(100)
);


CREATE TABLE admin_departments (
    admin_id INT,
    dept_id INT,
    PRIMARY KEY (admin_id, dept_id),
    FOREIGN KEY (admin_id) REFERENCES admins(admin_id),
    FOREIGN KEY (dept_id) REFERENCES departments(dept_id)
);


CREATE TABLE services (
    service_id INT AUTO_INCREMENT PRIMARY KEY,
    dept_id INT,
    service_name VARCHAR(100),
    service_type ENUM('Payable','Non-Payable'),
    description TEXT,
    FOREIGN KEY (dept_id) REFERENCES departments(dept_id)
);


CREATE TABLE requests (
    request_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    service_id INT,
    request_type ENUM('Request','Complaint'),
    description TEXT,
    status VARCHAR(30) DEFAULT 'Pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (service_id) REFERENCES services(service_id)
);


CREATE TABLE request_status_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    request_id INT,
    status VARCHAR(30),
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (request_id) REFERENCES requests(request_id)
);


CREATE TABLE payments (
    payment_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    service_id INT,
    amount DECIMAL(10,2),
    transaction_ref VARCHAR(100),
    payment_status VARCHAR(30),
    paid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (service_id) REFERENCES services(service_id)
);


CREATE TABLE documents (
    document_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    document_type VARCHAR(50),
    document_number VARCHAR(50),
    file_path TEXT,
    verified_status BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE TABLE notifications (
    notification_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    message TEXT,
    status VARCHAR(20) DEFAULT 'Unread',
    sent_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);


CREATE TABLE sessions (
    session_id INT PRIMARY KEY,
    user_id INT,
    login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    logout_time TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE TABLE feedback (
    feedback_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    service_id INT,
    rating INT,
    comment TEXT,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (service_id) REFERENCES services(service_id)
);

CREATE TABLE audit_logs (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    entity_name VARCHAR(50),
    action VARCHAR(50),
    performed_by VARCHAR(50),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
