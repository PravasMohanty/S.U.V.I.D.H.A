const express = require("express");
const deptRouter = express.Router();
const authAdmin = require("../middleware/authAdmin");
const {
    GetAllDepartments,
    GetDepartmentById,
    GetDepartmentServices,
    CreateDepartment,
    UpdateDepartment,
    DeleteDepartment,
    GetDepartmentStats
} = require("../controllers/deptController");

// Public routes (anyone can view)
deptRouter.get("/", GetAllDepartments);
deptRouter.get("/:dept_id", GetDepartmentById);
deptRouter.get("/:dept_id/services", GetDepartmentServices);

// Admin only routes (any authenticated admin can access)
deptRouter.post("/", authAdmin, CreateDepartment);
deptRouter.put("/:dept_id", authAdmin, UpdateDepartment);
deptRouter.delete("/:dept_id", authAdmin, DeleteDepartment);
deptRouter.get("/:dept_id/stats", authAdmin, GetDepartmentStats);

module.exports = deptRouter;