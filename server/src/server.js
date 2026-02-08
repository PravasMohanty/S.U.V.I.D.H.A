const express = require('express')
const dotenv = require('dotenv')
const cors = require('cors')
const http = require('http')
const { dbConnect } = require('../config/db')
const aliveRouter = require('../routes/aliveRouter')
const authRouter = require('../routes/authRouter')
const userRouter = require('../routes/userRouter')
const adminRouter = require('../routes/adminRouter')
const deptRouter = require('../routes/deptRoutes')
const serviceRouter = require('../routes/serviceRouter')

dotenv.config();  // ✅ ADD THIS - Load environment variables

dbConnect();

const app = express();
const server = http.createServer(app);

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cors())

app.use('/api/status', aliveRouter);
app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);
app.use('/api/admin', adminRouter);
app.use('/api/departments', deptRouter);
app.use('/api/departments', serviceRouter);  // ✅ FIXED - Changed from '/api/departments/services'

const PORT = process.env.PORT || 5000;  // ✅ ADD FALLBACK

server.listen(PORT, () => {
    console.log(`\n===============================================`)
    console.log(` Server running at http://localhost:${PORT}`)
    console.log(` Health Check: http://localhost:${PORT}/api/status `)
    console.log(`===============================================`)
})