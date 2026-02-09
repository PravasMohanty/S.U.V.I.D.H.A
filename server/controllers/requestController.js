const { pool } = require("../config/db");

// ===========================
// MAKE REQUEST (User) - Transaction ID passed from frontend in body
// ===========================
const MakeRequest = async (req, res) => {
    try {
        const { user_id } = req.user;
        const { service_id, request_type, description, transaction_ref } = req.body;

        if (!service_id || !request_type) {
            return res.status(400).json({ message: "Service ID and request type are required" });
        }

        // Validate request_type
        const validTypes = ['Request', 'Complaint'];
        if (!validTypes.includes(request_type)) {
            return res.status(400).json({ message: "Request type must be 'Request' or 'Complaint'" });
        }

        // Check if service exists and is active
        const [service] = await pool.execute(
            "SELECT service_id, service_name, service_type, fee, is_active FROM services WHERE service_id = ?",
            [service_id]
        );

        if (service.length === 0) {
            return res.status(404).json({ message: "Service not found" });
        }

        if (!service[0].is_active) {
            return res.status(400).json({ message: "This service is currently unavailable" });
        }

        const isPayable = service[0].service_type === 'Payable';

        // ✅ If payable service, transaction_ref is required
        if (isPayable && !transaction_ref) {
            return res.status(400).json({
                message: "Payment transaction reference is required for payable services"
            });
        }

        // ✅ If transaction_ref provided, verify payment exists and is successful
        if (transaction_ref) {
            const [payment] = await pool.execute(
                "SELECT payment_id, payment_status, service_id FROM payments WHERE transaction_ref = ? AND user_id = ?",
                [transaction_ref, user_id]
            );

            if (payment.length === 0) {
                return res.status(404).json({ message: "Payment not found" });
            }

            if (payment[0].payment_status !== 'Success') {
                return res.status(400).json({ message: "Payment not successful. Cannot create request." });
            }

            if (payment[0].service_id !== service_id) {
                return res.status(400).json({ message: "Payment is for a different service" });
            }
        }

        // Insert request
        const [result] = await pool.execute(
            `INSERT INTO requests (user_id, service_id, request_type, description, status) 
             VALUES (?, ?, ?, ?, 'Pending')`,
            [user_id, service_id, request_type, description || null]
        );

        const request_id = result.insertId;

        // ✅ If payment exists, link it to the request
        if (transaction_ref) {
            await pool.execute(
                "UPDATE payments SET request_id = ? WHERE transaction_ref = ?",
                [request_id, transaction_ref]
            );
        }

        // Add initial status to history
        await pool.execute(
            `INSERT INTO request_status_history (request_id, old_status, new_status, remarks) 
             VALUES (?, NULL, 'Pending', 'Request created')`,
            [request_id]
        );

        return res.status(201).json({
            success: true,
            message: "Request submitted successfully",
            request_id,
            service_name: service[0].service_name,
            service_type: service[0].service_type
        });

    } catch (error) {
        console.error("MakeRequest Error:", error);
        return res.status(500).json({ message: "Server error" });
    }
};

// ===========================
// CHECK REQUEST STATUS (User) - for a particular request or complaint
// ===========================
const CheckRequestStatus = async (req, res) => {
    try {
        const { user_id } = req.user;
        const { request_id } = req.params;

        // Get request details
        const [request] = await pool.execute(
            `SELECT r.request_id, r.request_type, r.description, r.status, r.created_at, r.updated_at,
                    s.service_name, s.service_type, s.fee, s.processing_time_days,
                    d.dept_name, d.office_location,
                    a.name as assigned_to_name,
                    p.payment_id, p.payment_status, p.amount, p.transaction_ref, p.paid_at
             FROM requests r
             JOIN services s ON r.service_id = s.service_id
             JOIN departments d ON s.dept_id = d.dept_id
             LEFT JOIN admins a ON r.assigned_to = a.admin_id
             LEFT JOIN payments p ON r.request_id = p.request_id
             WHERE r.request_id = ? AND r.user_id = ?`,
            [request_id, user_id]
        );

        if (request.length === 0) {
            return res.status(404).json({ message: "Request not found" });
        }

        // Get status history
        const [history] = await pool.execute(
            `SELECT old_status, new_status, remarks, changed_at
             FROM request_status_history
             WHERE request_id = ?
             ORDER BY changed_at ASC`,
            [request_id]
        );

        return res.status(200).json({
            success: true,
            request: request[0],
            status_history: history
        });

    } catch (error) {
        console.error("CheckRequestStatus Error:", error);
        return res.status(500).json({ message: "Server error" });
    }
};

// ===========================
// GET ALL USER REQUESTS (User)
// ===========================
const GetUserRequests = async (req, res) => {
    try {
        const { user_id } = req.user;
        const { status, request_type } = req.query;

        let query = `
            SELECT r.request_id, r.request_type, r.description, r.status, r.created_at,
                   s.service_name, s.service_type,
                   d.dept_name
            FROM requests r
            JOIN services s ON r.service_id = s.service_id
            JOIN departments d ON s.dept_id = d.dept_id
            WHERE r.user_id = ?
        `;
        const params = [user_id];

        if (status) {
            query += " AND r.status = ?";
            params.push(status);
        }

        if (request_type) {
            query += " AND r.request_type = ?";
            params.push(request_type);
        }

        query += " ORDER BY r.created_at DESC";

        const [requests] = await pool.execute(query, params);

        return res.status(200).json({
            success: true,
            count: requests.length,
            requests
        });

    } catch (error) {
        console.error("GetUserRequests Error:", error);
        return res.status(500).json({ message: "Server error" });
    }
};

// ===========================
// CANCEL REQUEST (User) - Only if Pending
// ===========================
const CancelRequest = async (req, res) => {
    try {
        const { user_id } = req.user;
        const { request_id } = req.params;

        // Check if request exists and belongs to user
        const [request] = await pool.execute(
            "SELECT request_id, status FROM requests WHERE request_id = ? AND user_id = ?",
            [request_id, user_id]
        );

        if (request.length === 0) {
            return res.status(404).json({ message: "Request not found" });
        }

        if (request[0].status !== 'Pending') {
            return res.status(400).json({ message: "Only pending requests can be cancelled" });
        }

        const oldStatus = request[0].status;

        // Update request status
        await pool.execute(
            "UPDATE requests SET status = 'Cancelled' WHERE request_id = ?",
            [request_id]
        );

        // Add to status history
        await pool.execute(
            `INSERT INTO request_status_history (request_id, old_status, new_status, remarks) 
             VALUES (?, ?, 'Cancelled', 'Cancelled by user')`,
            [request_id, oldStatus]
        );

        return res.status(200).json({
            success: true,
            message: "Request cancelled successfully"
        });

    } catch (error) {
        console.error("CancelRequest Error:", error);
        return res.status(500).json({ message: "Server error" });
    }
};

// ===========================
// GET ALL REQUESTS (Admin) - Department wise, grouped and sorted by date
// ===========================
const GetAllRequests = async (req, res) => {
    try {
        const { status, request_type, dept_id } = req.query;

        let query = `
            SELECT r.request_id, r.request_type, r.description, r.status, r.created_at,
                   u.user_id, u.full_name, u.email, u.mobile,
                   s.service_id, s.service_name,
                   d.dept_id, d.dept_name,
                   a.name as assigned_to_name
            FROM requests r
            JOIN users u ON r.user_id = u.user_id
            JOIN services s ON r.service_id = s.service_id
            JOIN departments d ON s.dept_id = d.dept_id
            LEFT JOIN admins a ON r.assigned_to = a.admin_id
            WHERE 1=1
        `;
        const params = [];

        if (status) {
            query += " AND r.status = ?";
            params.push(status);
        }

        if (request_type) {
            query += " AND r.request_type = ?";
            params.push(request_type);
        }

        if (dept_id) {
            query += " AND d.dept_id = ?";
            params.push(dept_id);
        }

        // ✅ Group by department and sort by date
        query += " ORDER BY d.dept_name ASC, r.created_at DESC";

        const [requests] = await pool.execute(query, params);

        // ✅ Group results by department
        const groupedByDepartment = requests.reduce((acc, request) => {
            const deptName = request.dept_name;
            if (!acc[deptName]) {
                acc[deptName] = {
                    dept_id: request.dept_id,
                    dept_name: deptName,
                    requests: []
                };
            }
            acc[deptName].requests.push(request);
            return acc;
        }, {});

        return res.status(200).json({
            success: true,
            total_requests: requests.length,
            departments: Object.values(groupedByDepartment)
        });

    } catch (error) {
        console.error("GetAllRequests Error:", error);
        return res.status(500).json({ message: "Server error" });
    }
};

// ===========================
// UPDATE REQUEST STATUS (Admin)
// ===========================
const UpdateRequestStatus = async (req, res) => {
    try {
        const { request_id } = req.params;
        const { status, remarks } = req.body;
        const { admin_id } = req.admin;

        if (!status) {
            return res.status(400).json({ message: "Status is required" });
        }

        // Validate status
        const validStatuses = ['Pending', 'In Progress', 'Completed', 'Rejected', 'Cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: "Invalid status" });
        }

        // Check if request exists
        const [request] = await pool.execute(
            "SELECT request_id, status FROM requests WHERE request_id = ?",
            [request_id]
        );

        if (request.length === 0) {
            return res.status(404).json({ message: "Request not found" });
        }

        const oldStatus = request[0].status;

        if (oldStatus === status) {
            return res.status(400).json({ message: "Request already has this status" });
        }

        // Update request status
        await pool.execute(
            "UPDATE requests SET status = ? WHERE request_id = ?",
            [status, request_id]
        );

        // Add to status history
        await pool.execute(
            `INSERT INTO request_status_history (request_id, old_status, new_status, changed_by, remarks) 
             VALUES (?, ?, ?, ?, ?)`,
            [request_id, oldStatus, status, admin_id, remarks || null]
        );

        return res.status(200).json({
            success: true,
            message: "Request status updated successfully"
        });

    } catch (error) {
        console.error("UpdateRequestStatus Error:", error);
        return res.status(500).json({ message: "Server error" });
    }
};

// ===========================
// ASSIGN REQUEST TO ADMIN (Admin) - Done by superadmin with code verification
// ===========================
const AssignRequest = async (req, res) => {
    try {
        const { request_id } = req.params;
        const { assigned_to, superadmin_code } = req.body;

        if (!assigned_to || !superadmin_code) {
            return res.status(400).json({ message: "Admin ID and superadmin code are required" });
        }

        // ✅ Verify superadmin code from .env
        if (superadmin_code !== process.env.SUPERADMIN_CODE) {
            return res.status(403).json({ message: "Invalid superadmin code" });
        }

        // Check if request exists
        const [request] = await pool.execute(
            "SELECT request_id FROM requests WHERE request_id = ?",
            [request_id]
        );

        if (request.length === 0) {
            return res.status(404).json({ message: "Request not found" });
        }

        // Check if admin exists
        const [admin] = await pool.execute(
            "SELECT admin_id, name FROM admins WHERE admin_id = ?",
            [assigned_to]
        );

        if (admin.length === 0) {
            return res.status(404).json({ message: "Admin not found" });
        }

        // Assign request
        await pool.execute(
            "UPDATE requests SET assigned_to = ? WHERE request_id = ?",
            [assigned_to, request_id]
        );

        return res.status(200).json({
            success: true,
            message: `Request assigned to ${admin[0].name} successfully`
        });

    } catch (error) {
        console.error("AssignRequest Error:", error);
        return res.status(500).json({ message: "Server error" });
    }
};

// ===========================
// GET REQUEST DETAILS (Admin)
// ===========================
const GetRequestDetails = async (req, res) => {
    try {
        const { request_id } = req.params;

        // Get request details
        const [request] = await pool.execute(
            `SELECT r.request_id, r.request_type, r.description, r.status, r.created_at, r.updated_at,
                    u.user_id, u.full_name, u.email, u.mobile,
                    s.service_id, s.service_name, s.service_type, s.fee,
                    d.dept_id, d.dept_name, d.office_location,
                    a.admin_id, a.name as assigned_to_name
             FROM requests r
             JOIN users u ON r.user_id = u.user_id
             JOIN services s ON r.service_id = s.service_id
             JOIN departments d ON s.dept_id = d.dept_id
             LEFT JOIN admins a ON r.assigned_to = a.admin_id
             WHERE r.request_id = ?`,
            [request_id]
        );

        if (request.length === 0) {
            return res.status(404).json({ message: "Request not found" });
        }

        // Get status history
        const [history] = await pool.execute(
            `SELECT h.old_status, h.new_status, h.remarks, h.changed_at,
                    a.name as changed_by_name
             FROM request_status_history h
             LEFT JOIN admins a ON h.changed_by = a.admin_id
             WHERE h.request_id = ?
             ORDER BY h.changed_at ASC`,
            [request_id]
        );

        // Get related documents
        const [documents] = await pool.execute(
            `SELECT document_id, document_type, document_number, file_path, verified_status, uploaded_at
             FROM documents
             WHERE request_id = ?
             ORDER BY uploaded_at DESC`,
            [request_id]
        );

        // Get payment info
        const [payments] = await pool.execute(
            `SELECT payment_id, amount, transaction_ref, payment_method, payment_status, paid_at
             FROM payments
             WHERE request_id = ?`,
            [request_id]
        );

        return res.status(200).json({
            success: true,
            request: request[0],
            status_history: history,
            documents,
            payments
        });

    } catch (error) {
        console.error("GetRequestDetails Error:", error);
        return res.status(500).json({ message: "Server error" });
    }
};

module.exports = {
    MakeRequest,
    CheckRequestStatus,
    GetUserRequests,
    CancelRequest,
    GetAllRequests,
    UpdateRequestStatus,
    AssignRequest,
    GetRequestDetails
};