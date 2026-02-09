const jwt = require("jsonwebtoken");
const { pool } = require("../config/db");

const authAdmin = async (req, res, next) => {
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
        if (decoded.type && decoded.type !== 'admin') {
            return res.status(403).json({
                success: false,
                message: "Invalid token type. Admin token required"
            });
        }

        // Check if admin exists in database
        const [rows] = await pool.execute(
            "SELECT admin_id, name, email, mobile, role FROM admins WHERE admin_id = ?",
            [decoded.admin_id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Admin not found"
            });
        }

        // Attach admin to request object
        req.admin = rows[0];
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

        console.error("authAdmin Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

module.exports = authAdmin;