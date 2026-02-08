const { pool } = require("../config/db");

// ===========================
// SHOW USER PROFILE
// ===========================
const ShowUserProfile = async (req, res) => {
    try {
        // req.user is already populated by authUser middleware
        const { user_id } = req.user;

        const [user] = await pool.execute(
            "SELECT user_id, full_name, email, mobile, language_preference, created_at FROM users WHERE user_id = ?",
            [user_id]
        );

        if (user.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        return res.status(200).json({
            success: true,
            user: user[0]
        });

    } catch (error) {
        console.error("ShowUserProfile Error:", error);
        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

// ===========================
// SHOW USER DOCUMENTS
// ===========================
const ShowUserDocuments = async (req, res) => {
    try {
        const { user_id } = req.user;

        const [documents] = await pool.execute(
            `SELECT document_id, document_type, document_number, file_path, 
                    verified_status, uploaded_at 
             FROM documents 
             WHERE user_id = ? 
             ORDER BY uploaded_at DESC`,
            [user_id]
        );

        return res.status(200).json({
            success: true,
            count: documents.length,
            documents
        });

    } catch (error) {
        console.error("ShowUserDocuments Error:", error);
        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

// ===========================
// UPDATE USER PROFILE
// ===========================
const UpdateUserProfile = async (req, res) => {
    try {
        const { user_id } = req.user;
        const { full_name, email, mobile, language_preference } = req.body;

        const updates = [];
        const params = [];

        if (full_name) {
            updates.push("full_name = ?");
            params.push(full_name);
        }

        if (email) {
            // Validate email format
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                return res.status(400).json({ message: "Invalid email format" });
            }

            // Check if email already exists for another user
            const [existing] = await pool.execute(
                "SELECT user_id FROM users WHERE email = ? AND user_id != ?",
                [email, user_id]
            );

            if (existing.length > 0) {
                return res.status(409).json({ message: "Email already in use" });
            }

            updates.push("email = ?");
            params.push(email);
        }

        if (mobile) {
            // Validate mobile format
            if (!/^[0-9]{10}$/.test(mobile)) {
                return res.status(400).json({ message: "Invalid mobile number" });
            }

            // Check if mobile already exists for another user
            const [existing] = await pool.execute(
                "SELECT user_id FROM users WHERE mobile = ? AND user_id != ?",
                [mobile, user_id]
            );

            if (existing.length > 0) {
                return res.status(409).json({ message: "Mobile number already in use" });
            }

            updates.push("mobile = ?");
            params.push(mobile);
        }

        if (language_preference) {
            updates.push("language_preference = ?");
            params.push(language_preference);
        }

        if (updates.length === 0) {
            return res.status(400).json({ message: "No fields to update" });
        }

        params.push(user_id);

        await pool.execute(
            `UPDATE users SET ${updates.join(", ")} WHERE user_id = ?`,
            params
        );

        return res.status(200).json({
            success: true,
            message: "Profile updated successfully"
        });

    } catch (error) {
        console.error("UpdateUserProfile Error:", error);
        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

// ===========================
// UPLOAD DOCUMENT
// ===========================
const UploadDocument = async (req, res) => {
    try {
        const { user_id } = req.user;
        const { document_type, document_number, file_path } = req.body;

        if (!document_type || !file_path) {
            return res.status(400).json({ message: "Document type and file path are required" });
        }

        const [result] = await pool.execute(
            `INSERT INTO documents (user_id, document_type, document_number, file_path) 
             VALUES (?, ?, ?, ?)`,
            [user_id, document_type, document_number || null, file_path]
        );

        return res.status(201).json({
            success: true,
            message: "Document uploaded successfully",
            document_id: result.insertId
        });

    } catch (error) {
        console.error("UploadDocument Error:", error);
        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

// ===========================
// DELETE DOCUMENT
// ===========================
const DeleteDocument = async (req, res) => {
    try {
        const { user_id } = req.user;
        const { document_id } = req.params;

        // Check if document belongs to user
        const [document] = await pool.execute(
            "SELECT document_id FROM documents WHERE document_id = ? AND user_id = ?",
            [document_id, user_id]
        );

        if (document.length === 0) {
            return res.status(404).json({ message: "Document not found or unauthorized" });
        }

        await pool.execute("DELETE FROM documents WHERE document_id = ?", [document_id]);

        return res.status(200).json({
            success: true,
            message: "Document deleted successfully"
        });

    } catch (error) {
        console.error("DeleteDocument Error:", error);
        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

// ===========================
// CHANGE PASSWORD
// ===========================
const ChangePassword = async (req, res) => {
    try {
        const { user_id } = req.user;
        const { current_password, new_password } = req.body;

        if (!current_password || !new_password) {
            return res.status(400).json({ message: "Both current and new password are required" });
        }

        if (new_password.length < 6) {
            return res.status(400).json({ message: "New password must be at least 6 characters" });
        }

        // Get current password from database
        const [user] = await pool.execute(
            "SELECT password FROM users WHERE user_id = ?",
            [user_id]
        );

        if (user.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        // Verify current password
        const bcrypt = require("bcryptjs");
        const isMatch = await bcrypt.compare(current_password, user[0].password);

        if (!isMatch) {
            return res.status(401).json({ message: "Current password is incorrect" });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(new_password, 10);

        // Update password
        await pool.execute(
            "UPDATE users SET password = ? WHERE user_id = ?",
            [hashedPassword, user_id]
        );

        return res.status(200).json({
            success: true,
            message: "Password changed successfully"
        });

    } catch (error) {
        console.error("ChangePassword Error:", error);
        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

// ===========================
// GET USER REQUESTS
// ===========================
const GetUserRequests = async (req, res) => {
    try {
        const { user_id } = req.user;
        const { status } = req.query; // Optional filter by status

        let query = `
            SELECT r.request_id, r.request_type, r.description, r.status, r.created_at,
                   s.service_name, d.dept_name
            FROM requests r
            JOIN services s ON r.service_id = s.service_id
            JOIN departments d ON s.dept_id = d.dept_id
            WHERE r.user_id = ?
        `;
        const params = [user_id];

        if (status) {
            query += " AND r.status = ?";
            params.push(status);
        }

        query += " ORDER BY r.created_at DESC";

        const [requests] = await pool.execute(query, params);

        return res.status(200).json({
            success: true,
            count: requests.length,
            requests
        });

    } catch (error) {
        console.error("GetUserRequests Error:", error);
        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

// ===========================
// GET USER NOTIFICATIONS
// ===========================
const GetUserNotifications = async (req, res) => {
    try {
        const { user_id } = req.user;

        const [notifications] = await pool.execute(
            `SELECT notification_id, title, message, notification_type, status, sent_time 
             FROM notifications 
             WHERE user_id = ? 
             ORDER BY sent_time DESC 
             LIMIT 50`,
            [user_id]
        );

        return res.status(200).json({
            success: true,
            count: notifications.length,
            notifications
        });

    } catch (error) {
        console.error("GetUserNotifications Error:", error);
        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

// ===========================
// MARK NOTIFICATION AS READ
// ===========================
const MarkNotificationRead = async (req, res) => {
    try {
        const { user_id } = req.user;
        const { notification_id } = req.params;

        // Check if notification belongs to user
        const [notification] = await pool.execute(
            "SELECT notification_id FROM notifications WHERE notification_id = ? AND user_id = ?",
            [notification_id, user_id]
        );

        if (notification.length === 0) {
            return res.status(404).json({ message: "Notification not found" });
        }

        await pool.execute(
            "UPDATE notifications SET status = 'Read', read_at = NOW() WHERE notification_id = ?",
            [notification_id]
        );

        return res.status(200).json({
            success: true,
            message: "Notification marked as read"
        });

    } catch (error) {
        console.error("MarkNotificationRead Error:", error);
        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

// ===========================
// GET USER RECEIPTS/PAYMENTS
// ===========================
const GetUserReceipts = async (req, res) => {
    try {
        const { user_id } = req.user;
        const { payment_status } = req.query;

        let query = `
            SELECT p.payment_id, p.amount, p.transaction_ref, p.payment_method, 
                   p.payment_status, p.paid_at,
                   s.service_name, s.service_type,
                   d.dept_name,
                   r.request_id, r.status as request_status
            FROM payments p
            JOIN services s ON p.service_id = s.service_id
            JOIN departments d ON s.dept_id = d.dept_id
            LEFT JOIN requests r ON p.request_id = r.request_id
            WHERE p.user_id = ?
        `;
        const params = [user_id];

        if (payment_status) {
            query += " AND p.payment_status = ?";
            params.push(payment_status);
        }

        query += " ORDER BY p.paid_at DESC";

        const [receipts] = await pool.execute(query, params);

        return res.status(200).json({
            success: true,
            count: receipts.length,
            receipts
        });

    } catch (error) {
        console.error("GetUserReceipts Error:", error);
        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

// Update exports
module.exports = {
    ShowUserProfile,
    ShowUserDocuments,
    UpdateUserProfile,
    UploadDocument,
    DeleteDocument,
    ChangePassword,
    GetUserRequests,
    GetUserNotifications,
    MarkNotificationRead,
    GetUserReceipts
};