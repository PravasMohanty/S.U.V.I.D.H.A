const express = require('express')
const aLive = require('../controllers/aliveController')

const aliveRouter = express.Router()

aliveRouter.get('/', aLive)

module.exports = aliveRouter