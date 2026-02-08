const express = require("express");
const userRouter = express.Router();
const authUser = require("../middleware/authUser");
const { Login, Register } = require("../controllers/authController");
const {
    ShowUserProfile,
    ShowUserDocuments,
    UpdateUserProfile,
    UploadDocument,
    DeleteDocument,
    ChangePassword,
    GetUserRequests,
    GetUserNotifications,
    MarkNotificationRead,
    GetUserReceipts  // Add this
} = require("../controllers/userController");

// ===========================
// PUBLIC ROUTES
// ===========================
userRouter.post("/login", Login);
userRouter.post("/register", Register);

// ===========================
// PROTECTED ROUTES (User only)
// ===========================
// Profile
userRouter.get("/profile", authUser, ShowUserProfile);
userRouter.put("/profile", authUser, UpdateUserProfile);
userRouter.put("/change-password", authUser, ChangePassword);

// Documents
userRouter.get("/documents", authUser, ShowUserDocuments);
userRouter.post("/documents", authUser, UploadDocument);
userRouter.delete("/documents/:document_id", authUser, DeleteDocument);

// Requests
userRouter.get("/requests", authUser, GetUserRequests);

// Notifications
userRouter.get("/notifications", authUser, GetUserNotifications);
userRouter.put("/notifications/:notification_id/read", authUser, MarkNotificationRead);

// Receipts/Payments
userRouter.get("/receipts", authUser, GetUserReceipts);

module.exports = userRouter;