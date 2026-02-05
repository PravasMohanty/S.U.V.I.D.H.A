const crypto = require("crypto");

function generateUserId() {
    const random = crypto.randomBytes(4).toString("hex").toUpperCase();
    return `UID${random}`;
}

function generateSessionId() {
    const random = crypto.randomBytes(6).toString("hex").toUpperCase();
    return `S${random}`;
}

function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

module.exports = {
    generateUserId,
    generateSessionId,
    generateOTP
};
