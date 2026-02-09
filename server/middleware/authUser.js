const jwt = require("jsonwebtoken");
const { pool } = require("../config/db");

const authUser = async (req, res, next) => {
    try {
        // Get token from header
        const token = req.headers.authorization?.split(" ")[1]; // Bearer <token>

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Access denied. No token provided"
            });
        }

        // Verify token - Use consistent secret
        const secret = process.env.SECRET_KEY;
        const decoded = jwt.verify(token, secret);

        // Validate token type (optional security check)
        if (decoded.type && decoded.type !== 'user') {
            return res.status(403).json({
                success: false,
                message: "Invalid token type. User token required"
            });
        }

        // Check if user exists in database
        const [rows] = await pool.execute(
            "SELECT user_id, full_name, email, mobile, language_preference FROM users WHERE user_id = ?",
            [decoded.user_id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // Attach user to request object
        req.user = rows[0];
        next();

    } catch (error) {
        if (error.name === "JsonWebTokenError") {
            return res.status(401).json({
                success: false,
                message: "Invalid token"
            });
        }

        if (error.name === "TokenExpiredError") {
            return res.status(401).json({
                success: false,
                message: "Token expired"
            });
        }

        console.error("authUser Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

module.exports = authUser;