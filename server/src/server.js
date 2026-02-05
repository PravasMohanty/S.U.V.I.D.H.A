const express = require('express')
const dotenv = require('dotenv')
const cors = require('cors')
const http = require('http')
const dbConnect = require('../config/db')
const aliveRouter = require('../routes/aliveRouter')
// const { connectRedis } = require("./config/redis");

dbConnect();
// connectRedis();

const app = express();
const server = http.createServer(app);

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cors())

app.use('/api/status', aliveRouter);

const PORT = process.env.PORT;

server.listen(PORT, () => {
    console.log(`\n===============================================`)
    console.log(` Server running at http://localhost:${PORT}`)
    console.log(` Health Check: http://localhost:${PORT}/api/status `)
    console.log(`===============================================`)
})