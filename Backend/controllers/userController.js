const jwt = require("jsonwebtoken");
const User = require("../models/userSchema");
const createError = require("../utils/createError");
const {hashPassword, comparePassword} = require("../utils/hashPassword");
const validator = require("validator");
const rateLimit = require("express-rate-limit");

let SMTPClient;
(async () => {
    const emailjs = await import("emailjs");
    SMTPClient = emailjs.SMTPClient;
})();


const validateStrongPassword = (password) => {
    return validator.isStrongPassword(password, {
        minLength: 6,
        minLowercase: 1,
        minUppercase: 1,
        minNumbers: 1,
        minSymbols: 1,
    });
};



const sendVerificationEmail = async (user) => {
    const verificationToken = jwt.sign(
        { id: user._id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: "1d" } // Token valid for 1 day
    );

    const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

    const client = new SMTPClient({
        user: process.env.EMAILJS_USER,
        password: process.env.EMAILJS_PASSWORD,
        host: process.env.EMAILJS_HOST,
        ssl: true, // Use SSL (Port 465)
        port: process.env.EMAILJS_PORT || 465,
    });

    try {
        await client.sendAsync({
            text: `Click the following link to verify your email: ${verificationLink}`,
            from: process.env.EMAILJS_FROM,
            to: user.email,
            subject: "Verify Your Email",
            attachment: [
                { data: `<p>Click <a href="${verificationLink}">here</a> to verify your email.</p>`, alternative: true },
            ],
        });
        console.log("Verification email sent successfully");
    } catch (error) {
        console.error("Error sending verification email:", error);
        throw new Error("Failed to send verification email");
    }
};


const resetPasswordLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 requests per windowMs
    message: "Too many password reset attempts. Please try again later.",
});

const registerUser = async(req, res, next) => {
    try{
        const {name, email, password} = req.body;

        if(!name) {
            return res.status(400).json({error: "Name is required"});
        }

        if (name.length > 50) {
            return res.status(400).json({error: "Name cannot exceed 50 characters"});
        }

        if (!validateStrongPassword(password)) {
            return res.status(400).json({
                error: "Password must be stronger. At least 6 characters, including a number, a symbol, and mixed case letters",
            });
        }        

        const exist = await User.findOne({email});
        if(exist) {
            return next(new createError("Email already exists", 400));
        }

        const hashedPassword = await hashPassword(password);
        const newUser = await User.create({
            name,
            email,
            password: hashedPassword,
            isVerified: false,
        });

        await sendVerificationEmail(newUser);

        const userForResponse = {...newUser._doc};
        delete userForResponse.password;

        res.status(201).json({
            status: "success",
            messsage: "User registred successfully. Please check your email to verify your account.",
            user: userForResponse,
        })
    } catch(error) {
        next(error);
    }
}

const loginUser = async (req, res, next) => {

    // Add login rate limit

    try {
        const {email, password} = req.body;

        if (!email || !validator.isEmail(email) || !password) {
            return next(new createError("Invalid email or password", 400));
        }

        const user = await User.findOne({email}).select("+password");
        if (!user || !(await comparePassword(password, user.password))){
            return next(new createError("Invalid email or password", 401));
        }

        const token = jwt.sign(
            {id: user._id}, // Add role here later when implementing administrator access
            process.env.JWT_SECRET,
            {expiresIn: process.env.JWT_EXPIRES_IN}
        );

        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "Strict",
            expires: new Date(Date.now() + parseInt(process.env.JWT_COOKIE_EXPIRES_IN, 10) * 24 * 60 * 1000),
        });

        const userForResponse = {...user.toObject()};
        delete userForResponse.password;

        res.status(200).json({
            status: "success",
            message: "User logged in successfully",
            user: userForResponse,
        });
        }catch(error) {
            next(error);
        }
}

const logoutUser = (req, res) => {
    res.cookie("token", "", {
        httpOnly: true,
        expires: new Date(0),
        secure: process.env.NODE_ENV === "production",
        sameSite: "Strict",
    });
    res.status(200).json({message: "Logged out successfully"});
};

const updateUser = async (req, res, next) => {
    const userId = req.user._id;
    const {name, password} = req.body;

    const updateData = {}; 

    try {
        if (name && name.trim()) {
            if (name.length > 50) {
                return res.status(400).json({error: "Name cannot exceed 50 characters"});
            }
            updateData.name = name.trim();
        }

        if (password && password.trim()) {
            if (!validateStrongPassword(password)) {
                return res.status(400).json({
                    error: "Password must be stronger. At least 6 characters, including a number, a symbol, and mixed case letters",
                });
            }
            const hashedPassword = await hashPassword(password);
            updateData.password = hashedPassword;
        }        

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({error: "No fields to update"});
        }

        const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
            new: true,
            select: "-password",
        });

        res.status(200).json({
            status: "success",
            message: "User updated successfully",
            user: updatedUser,
        });
    } catch (error) {
        console.error("Error updating user:", error);
        next(error);
    }
}

const deleteUser = async (req, res, next) => {
    const userId = req.user._id;

    try {
        const deletedUser = await User.findByIdAndDelete(userId);

        if (!deletedUser) {
            return res.status(404).json({error: "User not found"});
        }

        res.cookie("token", "", {
            httpOnly: true, 
            expires: new Date(0),
            secure: process.env.NODE_ENV === "production",
            sameSite: "Strict",
        });

        res.status(200).json({
            status: "success",
            message: "User account and data deleted successfully",
        });
    } catch (error) {
        console.error("Error deleting user:", error);
        next(error);
    }
}

const verifyEmail = async (req, res) => {
    const { token } = req.query;

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await User.findById(decoded.id);

        if (!user) {
            return res.status(400).json({ error: "Invalid token or user does not exist." });
        }

        if (user.isVerified) {
            return res.status(400).json({ error: "Email already verified. Please log in." });
        }

        user.isVerified = true; // Mark user as verified
        await user.save();

        res.cookie("token", "", {
            httpOnly: true,
            expires: new Date(0),
            secure: process.env.NODE_ENV === "production",
            sameSite: "Strict",
        });

        res.status(200).json({
            status: "success",
            message: "Email verified successfully. You can now log in.",
        });
    } catch (error) {
        res.status(400).json({ error: "Invalid or expired token." });
    }
};

const requestPasswordReset = async (req, res, next) => {
    const { email } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ error: "User with this email does not exist." });
        }

        const resetToken = jwt.sign(
            { id: user._id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: "1h" } // Token valid for 1 hour
        );

        const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

        const client = new SMTPClient({
            user: process.env.EMAILJS_USER,
            password: process.env.EMAILJS_PASSWORD,
            host: process.env.EMAILJS_HOST,
            ssl: true,
        });

        await client.sendAsync({
            text: `Reset your password by clicking the link: ${resetLink}`, // Plain text content
            from: process.env.EMAILJS_FROM,
            to: user.email,
            subject: "Reset Your Password",
            attachment: [
                { data: `<p>Click <a href="${resetLink}">here</a> to reset your password.</p>`, alternative: true }, // HTML content
            ],
        });

        res.status(200).json({
            status: "success",
            message: "Password reset link sent to your email.",
        });
    } catch (error) {
        console.error("Error sending password reset email:", error);
        next(error);
    }
};


const resetPassword = async (req, res, next) => {
    const { token } = req.query; // Token from the reset link
    const { newPassword } = req.body; // New password provided by the user
    
    try {
        if (!newPassword || newPassword.trim().length === 0) {
            return res.status(400).json({ error: "Password is required." });
        }

        if (!validateStrongPassword(newPassword)) {
            return res.status(400).json({
                error: "Password must be stronger. At least 6 characters, including a number, a symbol, and mixed case letters.",
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);

        if (!user) {
            return res.status(404).json({ error: "Invalid token or user does not exist." });
        }

        // Hash the new password and update it
        user.password = await hashPassword(newPassword);
        user.passwordChangedAt = new Date();
        await user.save();

        res.status(200).json({
            status: "success",
            message: "Password reset successfully. You can now log in with your new password.",
        });
    } catch (error) {
        console.error("Error resetting password:", error);
        res.status(400).json({ error: "Invalid or expired token." });
    }
};

const getProfile = async (req, res, next) => {
    try {
        const userId = req.user._id; // Extracted from the `authenticateUser` middleware
        const user = await User.findById(userId).select("-password"); // Fetch user without the password

        if (!user) {
            return res.status(404).json({ error: "User not found." });
        }

        res.status(200).json({
            status: "success",
            user, // Return the user's data
        });
    } catch (error) {
        console.error("Error fetching profile:", error);
        next(error);
    }
};


module.exports = {
    registerUser,
    loginUser,
    logoutUser,
    updateUser,
    deleteUser,
    verifyEmail,
    requestPasswordReset,
    resetPassword,
    resetPasswordLimiter,
    getProfile
};