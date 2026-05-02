const jwt = require('jsonwebtoken');
const response = require('../utils/responseHandler');


const authMiddleware = (req, res, next) => {
    const authToken = req.cookies?.authToken;
    if (!authToken) {
        return response({ res, statusCode: 401, message: 'authorization token missing please provide token' })
    }
    try {
        const decode = jwt.verify(authToken, process.env.JWT_SECRET);
        req.user = decode;
        console.log(req.user);
        next();
    } catch (error) {
        console.error(error)
        return response({ res, statusCode: 401, message: 'Invalid or expired token' })

    }
}

module.exports = authMiddleware;