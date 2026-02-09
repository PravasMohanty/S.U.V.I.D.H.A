const { pool } = require("../config/db");
const { generateServiceId } = require("../utils/generateContent");

// ===========================
// GET ALL SERVICES FROM A GIVEN DEPARTMENT
// ===========================
const GetServicesByDepartment = async (req, res) => {
    try {
        const { dept_id } = req.params;
        const { is_active } = req.query;

        // Check if department exists
        const [department] = await pool.execute(
            "SELECT dept_id FROM departments WHERE dept_id = ?",
            [dept_id]
        );

        if (department.length === 0) {
            return res.status(404).json({ message: "Department not found" });
        }

        let query = `
            SELECT service_id, service_name, service_type, description, 
                   fee, processing_time_days, is_active, created_at
            FROM services
            WHERE dept_id = ?
        `;
        const params = [dept_id];

        if (is_active !== undefined) {
            query += " AND is_active = ?";
            params.push(is_active === 'true');
        }

        query += " ORDER BY service_name";

        const [services] = await pool.execute(query, params);

        return res.status(200).json({
            success: true,
            count: services.length,
            services
        });

    } catch (error) {
        console.error("GetServicesByDepartment Error:", error);
        return res.status(500).json({ message: "Server error" });
    }
};

// ===========================
// ADD SERVICE (Admin only)
// ===========================
const AddService = async (req, res) => {
    try {
        const { dept_id } = req.params;
        const {
            service_name,
            service_type,
            description,
            fee,
            processing_time_days
        } = req.body;

        if (!service_name || !service_type) {
            return res.status(400).json({
                message: "Service name and service type are required"
            });
        }

        const validTypes = ["Payable", "Non-Payable"];
        if (!validTypes.includes(service_type)) {
            return res.status(400).json({
                message: "Service type must be 'Payable' or 'Non-Payable'"
            });
        }

        if (service_type === "Payable" && (fee === undefined || fee <= 0)) {
            return res.status(400).json({
                message: "Valid fee is required for payable services"
            });
        }

        const [department] = await pool.execute(
            "SELECT dept_id FROM departments WHERE dept_id = ?",
            [dept_id]
        );

        if (department.length === 0) {
            return res.status(404).json({ message: "Department not found" });
        }

        const [existing] = await pool.execute(
            "SELECT service_id FROM services WHERE dept_id = ? AND service_name = ?",
            [dept_id, service_name]
        );

        if (existing.length > 0) {
            return res.status(409).json({
                message: "Service already exists in this department"
            });
        }

        let serviceId;
        let exists = true;

        while (exists) {
            serviceId = generateServiceId();
            const [rows] = await pool.execute(
                "SELECT service_id FROM services WHERE service_id = ?",
                [serviceId]
            );
            exists = rows.length > 0;
        }

        await pool.execute(
            `INSERT INTO services 
            (service_id, dept_id, service_name, service_type, description, fee, processing_time_days)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                serviceId,
                dept_id,
                service_name,
                service_type,
                description || null,
                service_type === "Payable" ? fee : 0.0,
                processing_time_days || 7
            ]
        );

        return res.status(201).json({
            success: true,
            message: "Service added successfully",
            service_id: serviceId
        });

    } catch (error) {
        console.error("AddService Error:", error);
        return res.status(500).json({ message: "Server error" });
    }
};

// ===========================
// UPDATE SERVICE (Admin only)
// ===========================
const UpdateService = async (req, res) => {
    try {
        const { dept_id, service_id } = req.params;
        const { service_name, service_type, description, fee, processing_time_days, is_active } = req.body;

        // Check if service exists in the given department
        const [existing] = await pool.execute(
            "SELECT service_id, service_type FROM services WHERE service_id = ? AND dept_id = ?",
            [service_id, dept_id]
        );

        if (existing.length === 0) {
            return res.status(404).json({ message: "Service not found in this department" });
        }

        const updates = [];
        const params = [];

        if (service_name) {
            updates.push("service_name = ?");
            params.push(service_name);
        }

        if (service_type) {
            const validTypes = ['Payable', 'Non-Payable'];
            if (!validTypes.includes(service_type)) {
                return res.status(400).json({ message: "Invalid service type" });
            }
            updates.push("service_type = ?");
            params.push(service_type);
        }

        if (description !== undefined) {
            updates.push("description = ?");
            params.push(description);
        }

        if (fee !== undefined) {
            updates.push("fee = ?");
            params.push(fee);
        }

        if (processing_time_days !== undefined) {
            updates.push("processing_time_days = ?");
            params.push(processing_time_days);
        }

        if (is_active !== undefined) {
            updates.push("is_active = ?");
            params.push(is_active);
        }

        if (updates.length === 0) {
            return res.status(400).json({ message: "No fields to update" });
        }

        params.push(service_id);

        await pool.execute(
            `UPDATE services SET ${updates.join(", ")} WHERE service_id = ?`,
            params
        );

        return res.status(200).json({
            success: true,
            message: "Service updated successfully"
        });

    } catch (error) {
        console.error("UpdateService Error:", error);
        return res.status(500).json({ message: "Server error" });
    }
};

// ===========================
// REMOVE SERVICE (Admin only) - Only if no requests
// ===========================
const RemoveService = async (req, res) => {
    try {
        const { dept_id, service_id } = req.params;

        // Check if service exists in the given department
        const [service] = await pool.execute(
            "SELECT service_id FROM services WHERE service_id = ? AND dept_id = ?",
            [service_id, dept_id]
        );

        if (service.length === 0) {
            return res.status(404).json({ message: "Service not found in this department" });
        }

        // Check if service has any requests
        const [requests] = await pool.execute(
            "SELECT request_id FROM requests WHERE service_id = ?",
            [service_id]
        );

        if (requests.length > 0) {
            return res.status(400).json({
                message: "Cannot delete service with existing requests. Deactivate instead."
            });
        }

        // Check if service has any payments
        const [payments] = await pool.execute(
            "SELECT payment_id FROM payments WHERE service_id = ?",
            [service_id]
        );

        if (payments.length > 0) {
            return res.status(400).json({
                message: "Cannot delete service with existing payments. Deactivate instead."
            });
        }

        await pool.execute("DELETE FROM services WHERE service_id = ?", [service_id]);

        return res.status(200).json({
            success: true,
            message: "Service deleted successfully"
        });

    } catch (error) {
        console.error("RemoveService Error:", error);
        return res.status(500).json({ message: "Server error" });
    }
};

// ===========================
// TOGGLE SERVICE STATUS (Admin only)
// ===========================
const ToggleServiceStatus = async (req, res) => {
    try {
        const { dept_id, service_id } = req.params;

        const [service] = await pool.execute(
            "SELECT service_id, is_active FROM services WHERE service_id = ? AND dept_id = ?",
            [service_id, dept_id]
        );

        if (service.length === 0) {
            return res.status(404).json({ message: "Service not found in this department" });
        }

        const newStatus = !service[0].is_active;

        await pool.execute(
            "UPDATE services SET is_active = ? WHERE service_id = ?",
            [newStatus, service_id]
        );

        return res.status(200).json({
            success: true,
            message: `Service ${newStatus ? 'activated' : 'deactivated'} successfully`,
            is_active: newStatus
        });

    } catch (error) {
        console.error("ToggleServiceStatus Error:", error);
        return res.status(500).json({ message: "Server error" });
    }
};

// ===========================
// GET SERVICE STATISTICS (Admin)
// ===========================
const GetServiceStats = async (req, res) => {
    try {
        const { dept_id, service_id } = req.params;

        const [stats] = await pool.execute(
            `SELECT 
                s.service_id,
                s.service_name,
                s.service_type,
                s.fee,
                COUNT(DISTINCT r.request_id) as total_requests,
                COUNT(DISTINCT CASE WHEN r.status = 'Pending' THEN r.request_id END) as pending_requests,
                COUNT(DISTINCT CASE WHEN r.status = 'Completed' THEN r.request_id END) as completed_requests,
                COUNT(DISTINCT p.payment_id) as total_payments,
                COALESCE(SUM(p.amount), 0) as total_revenue
             FROM services s
             LEFT JOIN requests r ON s.service_id = r.service_id
             LEFT JOIN payments p ON s.service_id = p.service_id AND p.payment_status = 'Success'
             WHERE s.service_id = ? AND s.dept_id = ?
             GROUP BY s.service_id`,
            [service_id, dept_id]
        );

        if (stats.length === 0) {
            return res.status(404).json({ message: "Service not found in this department" });
        }

        return res.status(200).json({
            success: true,
            stats: stats[0]
        });

    } catch (error) {
        console.error("GetServiceStats Error:", error);
        return res.status(500).json({ message: "Server error" });
    }
};

module.exports = {
    GetServicesByDepartment,
    AddService,
    UpdateService,
    RemoveService,
    ToggleServiceStatus,
    GetServiceStats
};