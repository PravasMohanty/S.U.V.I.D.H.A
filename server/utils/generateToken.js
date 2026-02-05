const jwt = require('jsonwebtoken')
const dotenv = require('dotenv')

dotenv.config();

const generateToken = (user) => {
    return jwt.sign(
        {
            id: user._id,
            name: user.name,
            email: user.email,
            username: user.username,
            groupsPresent: user.groupsPresent,
            groupCount: user.groupCount
        },
        process.env.SECRET_KEY,
        { expiresIn: '1h' }
    )
}

module.exports = generateToken