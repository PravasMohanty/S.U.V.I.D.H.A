const crypto = require("crypto");

function hashAadhaar(aadhar) {
    return crypto.createHash("sha256").update(aadhar).digest("hex");
}

const Register = async (req, res) => {
    try {
        const {
            full_name,
            mobile,
            aadhar,
            email,
            password,
            language_preference
        } = req.body;

        if (!full_name || !password || (!mobile && !aadhar && !email)) {
            return res.status(400).json({ message: "Required fields missing" });
        }

        // 🔍 Check duplicates
        if (email) {
            const [e] = await pool.execute(
                "SELECT user_id FROM users WHERE email = ?",
                [email]
            );
            if (e.length) return res.status(409).json({ message: "Email already exists" });
        }

        if (mobile) {
            const [m] = await pool.execute(
                "SELECT user_id FROM users WHERE mobile = ?",
                [mobile]
            );
            if (m.length) return res.status(409).json({ message: "Mobile already exists" });
        }

        if (aadhar) {
            const [a] = await pool.execute(
                "SELECT user_id FROM users WHERE aadhar_hash = ?",
                [hashAadhaar(aadhar)]
            );
            if (a.length) return res.status(409).json({ message: "Aadhaar already exists" });
        }

        // 🔐 Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // 🧾 Insert user
        await pool.execute(
            `INSERT INTO users 
      (full_name, mobile, email, password, aadhar_hash, language_preference) 
      VALUES (?, ?, ?, ?, ?, ?)`,
            [
                full_name,
                mobile || null,
                email || null,
                hashedPassword,
                aadhar ? hashAadhaar(aadhar) : null,
                language_preference || "en"
            ]
        );

        return res.status(201).json({
            success: true,
            message: "User registered successfully"
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

module.exports = { hashAadhaar }