const aLive = (req, res) => {
    return res.status(200).json({ message: 'Server is alive' })
}

module.exports = aLive