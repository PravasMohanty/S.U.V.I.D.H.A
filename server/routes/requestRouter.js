const express = require("express");
const requestRouter = express.Router();
const authUser = require("../middleware/authUser");
const authAdmin = require("../middleware/authAdmin");
const {
    MakeRequest,
    CheckRequestStatus,
    GetUserRequests,
    CancelRequest,
    GetAllRequests,
    UpdateRequestStatus,
    AssignRequest,
    GetRequestDetails
} = require("../controllers/requestController");

// ===========================
// USER ROUTES
// ===========================
requestRouter.post("/", authUser, MakeRequest);
requestRouter.get("/my-requests", authUser, GetUserRequests);
requestRouter.get("/:request_id/status", authUser, CheckRequestStatus);
requestRouter.put("/:request_id/cancel", authUser, CancelRequest);

// ===========================
// ADMIN ROUTES
// ===========================
requestRouter.get("/all", authAdmin, GetAllRequests);
requestRouter.get("/:request_id", authAdmin, GetRequestDetails);
requestRouter.put("/:request_id/status", authAdmin, UpdateRequestStatus);
requestRouter.put("/:request_id/assign", authAdmin, AssignRequest);

module.exports = requestRouter;