const bcrypt = require("bcryptjs");
const { pool } = require("../config/db");
const { generateToken } = require("../utils/generateToken");
const { generateAdminId, generateAdminDefaultPassword } = require("../utils/generateCnt");

// LOGIN
const AdminLogin = async (req, res) => {
    try {
        const { admin_id, email, password } = req.body;

        if (!password || (!email && !admin_id)) {
            return res.status(400).json({ message: "Missing credentials" });
        }

        const query = admin_id
            ? "SELECT * FROM admins WHERE admin_id = ?"
            : "SELECT * FROM admins WHERE email = ?";

        const [rows] = await pool.execute(query, [admin_id || email]);

        if (rows.length === 0 || !await bcrypt.compare(password, rows[0].password)) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const admin = rows[0];
        const token = generateToken({ admin_id: admin.admin_id, role: admin.role });

        return res.status(200).json({
            success: true,
            token,
            admin: { admin_id: admin.admin_id, name: admin.name, email: admin.email, role: admin.role }
        });

    } catch (error) {
        console.error("AdminLogin Error:", error);
        return res.status(500).json({ message: "Server error" });
    }
};

// ADD ADMIN
const AddAdmin = async (req, res) => {
    try {
        const { name, email, role, mobile } = req.body;

        if (!name || !email || !role) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        // Validate role
        const validRoles = ['admin', 'super_admin', 'department_admin'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ message: "Invalid role" });
        }

        // Validate email format
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ message: "Invalid email format" });
        }

        // Check email exists
        const [existing] = await pool.execute("SELECT admin_id FROM admins WHERE email = ?", [email]);
        if (existing.length > 0) {
            return res.status(409).json({ message: "Email already exists" });
        }

        // Generate unique admin_id
        let admin_id = generateAdminId();
        let attempts = 0;
        const MAX_ATTEMPTS = 10;

        while (attempts < MAX_ATTEMPTS) {
            const [exists] = await pool.execute("SELECT admin_id FROM admins WHERE admin_id = ?", [admin_id]);
            if (exists.length === 0) break;
            admin_id = generateAdminId();
            attempts++;
        }

        if (attempts === MAX_ATTEMPTS) {
            return res.status(500).json({ message: "Unable to generate unique admin ID" });
        }

        // Generate password
        const password = generateAdminDefaultPassword(name, role);
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert
        await pool.execute(
            "INSERT INTO admins (admin_id, name, email, mobile, password, role) VALUES (?, ?, ?, ?, ?, ?)",
            [admin_id, name, email, mobile || null, hashedPassword, role]
        );

        return res.status(201).json({
            success: true,
            message: "Admin added",
            admin: { admin_id, name, email, role, password } // Send password once
        });

    } catch (error) {
        console.error("AddAdmin Error:", error);
        return res.status(500).json({ message: "Server error" });
    }
};

// RESET PASSWORD
const ResetAdminPassword = async (req, res) => {
    try {
        const { admin_id } = req.params;
        const { new_password } = req.body;

        if (!new_password || new_password.length < 8) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 8 characters"
            });
        }

        const [admin] = await pool.execute(
            "SELECT admin_id FROM admins WHERE admin_id = ?",
            [admin_id]
        );

        if (admin.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Admin not found"
            });
        }

        const hashedPassword = await bcrypt.hash(new_password, 10);

        await pool.execute(
            "UPDATE admins SET password = ? WHERE admin_id = ?",
            [hashedPassword, admin_id]
        );

        return res.status(200).json({
            success: true,
            message: "Password reset successfully"
        });

    } catch (error) {
        console.error("ResetAdminPassword Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};
// GET ADMIN PROFILE
const GetAdminProfile = async (req, res) => {
    try {
        // req.admin is already populated by authAdmin middleware
        const { admin_id } = req.admin;

        const [admin] = await pool.execute(
            "SELECT admin_id, name, email, mobile, role, created_at FROM admins WHERE admin_id = ?",
            [admin_id]
        );

        if (admin.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Admin not found"
            });
        }

        return res.status(200).json({
            success: true,
            admin: admin[0]
        });

    } catch (error) {
        console.error("GetAdminProfile Error:", error);
        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};


module.exports = { AdminLogin, AddAdmin, ResetAdminPassword, GetAdminProfile };