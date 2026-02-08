const express = require('express')
const { Login, Register } = require('../controllers/authController')

const authRouter = express.Router()

authRouter.post('/login', Login)
authRouter.post('/register', Register)

module.exports = authRouter;