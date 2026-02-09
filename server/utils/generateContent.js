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
    return stringpass = `Admin@${name}_${role}`;
}

const generateDepartmentId = () => {
    const random = crypto.randomBytes(4).toString("hex").toUpperCase();
    return `DEPT_${random}`
}

const generateRequestId = (service_id) => {
    return Math.floor(10000000 + Math.random() * 90000000);
}

const generateServiceId = (dept_id) => {
    const random = crypto.randomBytes(3).toString("hex").toUpperCase();
    return `SERV_${random}@${dept_id}`
}

module.exports = {
    generateUserId,
    generateSessionId,
    generateOTP,
    generateAdminId,
    generateDepartmentId,
    generateAdminDefaultPassword,
    generateRequestId,
    generateServiceId
};
