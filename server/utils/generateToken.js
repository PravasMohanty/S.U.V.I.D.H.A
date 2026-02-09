const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config();

/**
 * Generate JWT token for users and admins
 * @param {Object} payload - Token payload (user_id/admin_id, email, role, etc.)
 * @param {string} expiresIn - Token expiration time (default: '24h')
 * @returns {string} JWT token
 */
const generateToken = (payload, expiresIn = '24h') => {
    // Use JWT_SECRET as the primary secret key for consistency
    const secret = process.env.SECRET_KEY;

    if (!secret) {
        throw new Error('JWT_SECRET is not defined in environment variables');
    }

    return jwt.sign(payload, secret, { expiresIn });
};

module.exports = { generateToken };