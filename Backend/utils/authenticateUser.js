const jwt = require("jsonwebtoken");
const User = require("../models/userSchema");

const authenticateUser = async (req, res, next) => {
    try {
        const token =
            req.cookies?.token || 
            (req.headers.authorization?.startsWith("Bearer ") 
                ? req.headers.authorization.split(" ")[1] 
                : null);

        if (!token) {
            console.log("No token provided");
            return res.status(401).json({ error: "Authentication required" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);

        if (!user || !user.isVerified) {
            return res.status(401).json({
                error: "Invalid token or account not verified. Please verify your email.",
            });
        }

        if (user.passwordChangedAt && decoded.iat * 1000 < user.passwordChangedAt.getTime()) {
            return res.status(401).json({
                error: "Password has been changed recently. Please log in again.",
            });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error("Authentication error:", error);
        res.status(401).json({ error: "Authentication failed" });
    }
};

module.exports = authenticateUser;
