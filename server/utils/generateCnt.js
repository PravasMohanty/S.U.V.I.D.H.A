const crypto = require("crypto");

function generateUserId() {
    const random = crypto.randomBytes(4).toString("hex").toUpperCase();
    return `UID${random}`;
}

function generateAdminId() {
    const random = crypto.randomBytes(4).toString("hex").toUpperCase();
    return `A${random}`;
}

function generateSessionId() {
    const random = crypto.randomBytes(6).toString("hex").toUpperCase();
    return `S${random}`;
}

function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

const generateAdminDefaultPassword = (name, role) => {
    let stringpass = `Admin@${name}_${role}`;
}

const generateDepartmentId = () => {
    const random = crypto.randomBytes(4).toString("hex").toUpperCase();
    return `DEPT_${random}`
}

module.exports = {
    generateUserId,
    generateSessionId,
    generateOTP,
    generateAdminId,
    generateDepartmentId,
    generateAdminDefaultPassword
};
