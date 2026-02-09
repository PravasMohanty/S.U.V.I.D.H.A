const { pool } = require("../config/db");
const { generateDepartmentId } = require("../utils/generateContent");

// ===========================
// GET ALL DEPARTMENTS
// ===========================
const GetAllDepartments = async (req, res) => {
    try {
        const [departments] = await pool.execute(
            "SELECT * FROM departments ORDER BY dept_name ASC"
        );

        return res.status(200).json({
            success: true,
            count: departments.length,
            departments
        });

    } catch (error) {
        console.error("GetAllDepartments Error:", error);
        return res.status(500).json({ message: "Server error" });
    }
};

// ===========================
// GET DEPARTMENT BY ID
// ===========================
const GetDepartmentById = async (req, res) => {
    try {
        const { dept_id } = req.params;

        const [department] = await pool.execute(
            "SELECT * FROM departments WHERE dept_id = ?",
            [dept_id]
        );

        if (department.length === 0) {
            return res.status(404).json({ message: "Department not found" });
        }

        return res.status(200).json({
            success: true,
            department: department[0]
        });

    } catch (error) {
        console.error("GetDepartmentById Error:", error);
        return res.status(500).json({ message: "Server error" });
    }
};

// ===========================
// GET SERVICES BY DEPARTMENT
// ===========================
const GetDepartmentServices = async (req, res) => {
    try {
        const { dept_id } = req.params;

        // Check if department exists
        const [department] = await pool.execute(
            "SELECT dept_id FROM departments WHERE dept_id = ?",
            [dept_id]
        );

        if (department.length === 0) {
            return res.status(404).json({ message: "Department not found" });
        }

        // Get all services for this department
        const [services] = await pool.execute(
            `SELECT service_id, service_name, service_type, description, fee, processing_time_days, is_active 
             FROM services 
             WHERE dept_id = ? AND is_active = TRUE
             ORDER BY service_name ASC`,
            [dept_id]
        );

        return res.status(200).json({
            success: true,
            count: services.length,
            services
        });

    } catch (error) {
        console.error("GetDepartmentServices Error:", error);
        return res.status(500).json({ message: "Server error" });
    }
};

// ===========================
// CREATE DEPARTMENT (Admin only)
// ===========================
const CreateDepartment = async (req, res) => {
    try {
        const { dept_name, office_location, contact_email, contact_phone } = req.body;

        if (!dept_name) {
            return res.status(400).json({ message: "Department name is required" });
        }

        //  Check if department already exists
        const [existing] = await pool.execute(
            "SELECT dept_id FROM departments WHERE dept_name = ?",
            [dept_name]
        );

        if (existing.length > 0) {
            return res.status(409).json({ message: "Department already exists" });
        }

        //  Generate Dept ID
        const generatedDeptId = generateDepartmentId(dept_name);

        //  Insert department (FIXED placeholders)
        await pool.execute(
            `INSERT INTO departments 
            (dept_id, dept_name, office_location, contact_email, contact_phone) 
            VALUES (?, ?, ?, ?, ?)`,
            [
                generatedDeptId,
                dept_name,
                office_location || null,
                contact_email || null,
                contact_phone || null
            ]
        );

        return res.status(201).json({
            success: true,
            message: "Department created successfully",
            dept_id: generatedDeptId
        });

    } catch (error) {
        console.error("CreateDepartment Error:", error);
        return res.status(500).json({ message: "Server error" });
    }
};


// ===========================
// UPDATE DEPARTMENT (Admin only)
// ===========================
const UpdateDepartment = async (req, res) => {
    try {
        const { dept_id } = req.params;
        const { dept_name, office_location, contact_email, contact_phone } = req.body;

        // Check if department exists
        const [existing] = await pool.execute(
            "SELECT dept_id FROM departments WHERE dept_id = ?",
            [dept_id]
        );

        if (existing.length === 0) {
            return res.status(404).json({ message: "Department not found" });
        }

        const updates = [];
        const params = [];

        if (dept_name) {
            updates.push("dept_name = ?");
            params.push(dept_name);
        }
        if (office_location !== undefined) {
            updates.push("office_location = ?");
            params.push(office_location);
        }
        if (contact_email !== undefined) {
            updates.push("contact_email = ?");
            params.push(contact_email);
        }
        if (contact_phone !== undefined) {
            updates.push("contact_phone = ?");
            params.push(contact_phone);
        }

        if (updates.length === 0) {
            return res.status(400).json({ message: "No fields to update" });
        }

        params.push(dept_id);

        await pool.execute(
            `UPDATE departments SET ${updates.join(", ")} WHERE dept_id = ?`,
            params
        );

        return res.status(200).json({
            success: true,
            message: "Department updated"
        });

    } catch (error) {
        console.error("UpdateDepartment Error:", error);
        return res.status(500).json({ message: "Server error" });
    }
};

// ===========================
// DELETE DEPARTMENT (Admin only)
// ===========================
const DeleteDepartment = async (req, res) => {
    try {
        const { dept_id } = req.params;

        // Check if department exists
        const [department] = await pool.execute(
            "SELECT dept_id FROM departments WHERE dept_id = ?",
            [dept_id]
        );

        if (department.length === 0) {
            return res.status(404).json({ message: "Department not found" });
        }

        // Check if department has active services
        const [services] = await pool.execute(
            "SELECT service_id FROM services WHERE dept_id = ?",
            [dept_id]
        );

        if (services.length > 0) {
            return res.status(400).json({
                message: "Cannot delete department with existing services. Delete services first."
            });
        }

        await pool.execute("DELETE FROM departments WHERE dept_id = ?", [dept_id]);

        return res.status(200).json({
            success: true,
            message: "Department deleted"
        });

    } catch (error) {
        console.error("DeleteDepartment Error:", error);
        return res.status(500).json({ message: "Server error" });
    }
};

// ===========================
// GET DEPARTMENT STATS (Admin)
// ===========================
const GetDepartmentStats = async (req, res) => {
    try {
        const { dept_id } = req.params;

        const [stats] = await pool.execute(
            `SELECT 
                d.dept_id,
                d.dept_name,
                COUNT(DISTINCT s.service_id) as total_services,
                COUNT(DISTINCT r.request_id) as total_requests,
                COUNT(DISTINCT CASE WHEN r.status = 'Pending' THEN r.request_id END) as pending_requests,
                COUNT(DISTINCT CASE WHEN r.status = 'Completed' THEN r.request_id END) as completed_requests
             FROM departments d
             LEFT JOIN services s ON d.dept_id = s.dept_id
             LEFT JOIN requests r ON s.service_id = r.service_id
             WHERE d.dept_id = ?
             GROUP BY d.dept_id`,
            [dept_id]
        );

        if (stats.length === 0) {
            return res.status(404).json({ message: "Department not found" });
        }

        return res.status(200).json({
            success: true,
            stats: stats[0]
        });

    } catch (error) {
        console.error("GetDepartmentStats Error:", error);
        return res.status(500).json({ message: "Server error" });
    }
};

module.exports = {
    GetAllDepartments,
    GetDepartmentById,
    GetDepartmentServices,
    CreateDepartment,
    UpdateDepartment,
    DeleteDepartment,
    GetDepartmentStats
};