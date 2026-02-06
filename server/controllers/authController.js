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

        if (!password || (!mobile && !aadhar && !email)) {
            return res.status(400).json({ message: "Credentials required" });
        }

        let rows;

        if (mobile) {
            [rows] = await pool.execute(
                "SELECT * FROM users WHERE mobile = ?",
                [mobile]
            );
        }
        else if (aadhar) {
            [rows] = await pool.execute(
                "SELECT * FROM users WHERE aadhar_hash = ?",
                [hashAadhaar(aadhar)]
            );
        }
        else {
            [rows] = await pool.execute(
                "SELECT * FROM users WHERE email = ?",
                [email]
            );
        }

        if (rows.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        const user = rows[0];

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ message: "Invalid password" });
        }

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
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};


// ===========================
// REGISTER
// ===========================
const Register = async (req, res) => {
    try {
        const {
            full_name,
            mobile,
            aadhar,
            email,
            password,
            language_preference
        } = req.body;

        if (!full_name || !password || (!mobile && !aadhar && !email)) {
            return res.status(400).json({ message: "Required fields missing" });
        }

        // 🔍 Duplicate checks
        const checks = [];

        if (email) {
            checks.push(
                pool.execute("SELECT user_id FROM users WHERE email = ?", [email])
            );
        }

        if (mobile) {
            checks.push(
                pool.execute("SELECT user_id FROM users WHERE mobile = ?", [mobile])
            );
        }

        if (aadhar) {
            checks.push(
                pool.execute(
                    "SELECT user_id FROM users WHERE aadhar_hash = ?",
                    [hashAadhaar(aadhar)]
                )
            );
        }

        const results = await Promise.all(checks);

        for (const [rows] of results) {
            if (rows.length) {
                return res.status(409).json({ message: "User already exists" });
            }
        }

        // 🔐 Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // 🆔 Generate unique user_id
        let userId, exists = true;

        while (exists) {
            userId = generateUserId();
            const [rows] = await pool.execute(
                "SELECT user_id FROM users WHERE user_id = ?",
                [userId]
            );
            exists = rows.length > 0;
        }

        // 🧾 Insert
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
                language_preference || "en"
            ]
        );

        return res.status(201).json({
            success: true,
            message: "User registered successfully",
            user_id: userId
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

module.exports = { Login, Register };
