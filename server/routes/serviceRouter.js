const express = require("express");
const serviceRouter = express.Router();
const authAdmin = require("../middleware/authAdmin");
const {
    GetServicesByDepartment,
    AddService,
    UpdateService,
    RemoveService,
    ToggleServiceStatus,
    GetServiceStats
} = require("../controllers/serviceController");

// ===========================
// PUBLIC ROUTES
// ===========================
serviceRouter.get("/:dept_id/services", GetServicesByDepartment);

// ===========================
// ADMIN ROUTES
// ===========================
serviceRouter.post("/:dept_id/services", authAdmin, AddService);
serviceRouter.put("/:dept_id/services/:service_id", authAdmin, UpdateService);
serviceRouter.delete("/:dept_id/services/:service_id", authAdmin, RemoveService);
serviceRouter.patch("/:dept_id/services/:service_id/toggle", authAdmin, ToggleServiceStatus);
serviceRouter.get("/:dept_id/services/:service_id/stats", authAdmin, GetServiceStats);

module.exports = serviceRouter;