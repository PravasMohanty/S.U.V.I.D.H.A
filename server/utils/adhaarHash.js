const crypto = require("crypto");

function hashAadhaar(aadhar) {
  return crypto.createHash("sha256").update(aadhar).digest("hex");
}

module.exports = { hashAadhaar }