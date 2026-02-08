const bcrypt = require("bcryptjs");
const { pool } = require("../config/db");
const { generateToken } = require("../utils/generateToken");
const { hashAadhaar } = require("../utils/adhaarHash");
const { generateUserId } = require("../utils/generateCnt");

// ===========================
// LOGIN
// ===========================
const Login = async (req, res) => {
    try {
        const { mobile, aadhar, email, password } = req.body;

        if (!password) {
            return res.status(400).json({ message: "Password is required" });
        }

        if (!mobile && !aadhar && !email) {
            return res.status(400).json({ message: "Mobile, Aadhar, or Email is required" });
        }

        // Build query based on input
        let query, param;

        if (mobile) {
            query = "SELECT * FROM users WHERE mobile = ?";
            param = mobile;
        } else if (aadhar) {
            query = "SELECT * FROM users WHERE aadhar_hash = ?";
            param = hashAadhaar(aadhar);
        } else {
            query = "SELECT * FROM users WHERE email = ?";
            param = email;
        }

        const [rows] = await pool.execute(query, [param]);

        // Check user exists and password matches
        if (rows.length === 0 || !await bcrypt.compare(password, rows[0].password)) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const user = rows[0];

        const token = generateToken({
            user_id: user.user_id,
            email: user.email
        });

        return res.status(200).json({
            success: true,
            message: "Login successful",
            token,
            user: {
                user_id: user.user_id,
                full_name: user.full_name,
                email: user.email,
                mobile: user.mobile,
                language_preference: user.language_preference
            }
        });

    } catch (error) {
        console.error("Login Error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// ===========================
// REGISTER
// ===========================
const Register = async (req, res) => {
    try {
        const { full_name, mobile, aadhar, email, password, language_preference } = req.body;

        // Validation
        if (!full_name || !password) {
            return res.status(400).json({ message: "Name and password are required" });
        }

        if (!mobile && !aadhar && !email) {
            return res.status(400).json({ message: "At least one of mobile, aadhar, or email is required" });
        }

        // Password strength check
        if (password.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters" });
        }

        // Validate mobile format (if provided)
        if (mobile && !/^[0-9]{10}$/.test(mobile)) {
            return res.status(400).json({ message: "Invalid mobile number format" });
        }

        // Validate email format (if provided)
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ message: "Invalid email format" });
        }

        // Check duplicates
        const checks = [];

        if (email) {
            checks.push(pool.execute("SELECT user_id FROM users WHERE email = ?", [email]));
        }
        if (mobile) {
            checks.push(pool.execute("SELECT user_id FROM users WHERE mobile = ?", [mobile]));
        }
        if (aadhar) {
            checks.push(pool.execute("SELECT user_id FROM users WHERE aadhar_hash = ?", [hashAadhaar(aadhar)]));
        }

        const results = await Promise.all(checks);

        for (const [rows] of results) {
            if (rows.length > 0) {
                return res.status(409).json({ message: "User already exists with this mobile/email/aadhar" });
            }
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Generate unique user_id
        let userId = generateUserId();
        let attempts = 0;
        const MAX_ATTEMPTS = 10;

        while (attempts < MAX_ATTEMPTS) {
            const [existing] = await pool.execute(
                "SELECT user_id FROM users WHERE user_id = ?",
                [userId]
            );

            if (existing.length === 0) break;

            userId = generateUserId();
            attempts++;
        }

        if (attempts === MAX_ATTEMPTS) {
            return res.status(500).json({ message: "Unable to generate unique user ID" });
        }

        // Insert user
        await pool.execute(
            `INSERT INTO users 
            (user_id, full_name, mobile, email, password, aadhar_hash, language_preference) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                userId,
                full_name,
                mobile || null,
                email || null,
                hashedPassword,
                aadhar ? hashAadhaar(aadhar) : null,
                language_preference || "English"
            ]
        );

        return res.status(201).json({
            success: true,
            message: "User registered successfully",
            user_id: userId
        });

    } catch (error) {
        console.error("Register Error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

module.exports = { Login, Register };