const express = require("express");
const adminRouter = express.Router();
const authAdmin = require("../middleware/authAdmin");
const { AdminLogin, AddAdmin, ResetAdminPassword, GetAdminProfile } = require("../controllers/adminController");

// ===========================
// PUBLIC ROUTES
// ===========================
adminRouter.post("/login", AdminLogin);

// ===========================
// PROTECTED ROUTES (Admin only)
// ===========================
adminRouter.post("/add", authAdmin, AddAdmin);
adminRouter.put("/reset-password/:admin_id", authAdmin, ResetAdminPassword);
adminRouter.get("/profile", authAdmin, GetAdminProfile);

module.exports = adminRouter;