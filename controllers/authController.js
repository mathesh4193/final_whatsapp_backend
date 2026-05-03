const User = require('../models/User');
const sentOtpToEmail = require('../services/emailService');
const twilioService = require('../services/twilioService');
const response = require('../utils/responseHandler');
const otpGenerater = require('../utils/otpGenerater');
const generateToken = require('../utils/generateToken');
const { uploadFileToCloudinary } = require('../config/cloudinaryConfig');
const Conversation =require('../models/Conversation');



//step 1 send otp
const sendOTP = async (req, res) => {
    const { phoneNumber, phoneSuffix, email } = req.body;
    const otp = otpGenerater();
    const Expiry = new Date(Date.now() + 5 * 60 * 1000);

    let user;
    try {
        if (email) {
            user = await User.findOne({ email });
            if (!user) {
                user = new User({ email });
            }

            user.emailOtp = otp;
            user.emailOtpExpiry = Expiry;

            await user.save();
            await sentOtpToEmail(email, otp);

            return response({ res, statusCode: 200, message: 'OTP sent successfully', data: { email } });
        }
        if (!phoneNumber || !phoneSuffix) {
            return response({ res, statusCode: 400, message: 'Phone number and suffix are required' });
        }
        const fullPhoneNumber = `${phoneSuffix}${phoneNumber}`;
        user = await User.findOne({ phoneNumber });
        if (!user) {
            user = new User({ phoneNumber, phoneSuffix });
        }

        await twilioService.sendOtpToPhoneNumber(fullPhoneNumber);
        await user.save();

        return response({ res, statusCode: 200, message: 'OTP sent successfully', data: { user } });
    } catch (error) {
        console.error(error);
        return response({ res, statusCode: 500, message: 'Internal server error' });
    }
}

//step 2 verify otp
const verifyOTP = async (req, res) => {
    const { phoneNumber, otp, phoneSuffix, email } = req.body;

    try {
        let user;
        if (email) {
            user = await User.findOne({ email });
            if (!user) {
                return response({ res, statusCode: 404, message: 'User not found' });
            }
            const now = new Date();
            if (!user.emailOtp || String(user.emailOtp) !== String(otp) || now > new Date(user.emailOtpExpiry)) {
                return response({ res, statusCode: 400, message: 'Invalid or expired OTP' });
            };
            user.isVerified = true;
            user.emailOtp = null;
            user.emailOtpExpiry = null;
            await user.save();
        }
        else {
            if (!phoneNumber || !phoneSuffix) {
                return response({ res, statusCode: 400, message: 'Phone number and suffix are required' });
            }
            const fullPhoneNumber = `${phoneSuffix}${phoneNumber}`;
            user = await User.findOne({ phoneNumber });
            if (!user) {
                return response({ res, statusCode: 404, message: 'User not found' });
            }
            const result = await twilioService.verifyOtp(fullPhoneNumber, otp);
            if (result.status !== 'approved') {
                return response({ res, statusCode: 400, message: 'Invalid OTP' });
            }
            user.isVerified = true;
            await user.save();
        }
        const token=generateToken(user);
        res.cookie('authToken', token, {
            httpOnly: true,
            maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
        });
        return response({ res, statusCode: 200, message: 'OTP verified successfully', data: { user, token } });
    }
    catch (error) {
        console.error(error);
        return response({ res, statusCode: 500, message: 'Internal server error' });
    }
};

const updateProfile = async (req, res) => {
    const { username, agreed, about } = req.body;
    const userId = req.user.id;
    try {

        const user = await User.findById(userId);
        if (!user) {
            return response({ res, statusCode: 404, message: 'User not found' });
        }
        const file = req.file;
        if (file) {
            const uploadResult = await uploadFileToCloudinary(file);
            console.log(uploadResult);
            user.profilePicture = uploadResult.secure_url;
        }
        else if (req.body.profilePicture) {
            user.profilePicture = req.body.profilePicture;
        }

        if (username) user.username = username;
        if (agreed) user.agreed = agreed;
        if (about) user.about = about;
        await user.save();

        console.log(user)
        return response({ res, statusCode: 200, message: 'Profile updated successfully', data: { user } });
    } catch (error) {
        console.error(error);
        return response({ res, statusCode: 500, message: 'Internal server error' });
    }
}

const checkAuthenticated = async (req, res) => {
    try {
        const userId = req.user.id;
        if (!userId) {
            return response({ res, statusCode: 401, message: 'Unauthorized! Please login before accessing our app' });
        }
        const user = await User.findById(userId);
        if (!user) {
            return response({ res, statusCode: 404, message: 'User not found' });
        }
        return response({ res, statusCode: 200, message: 'User retrieved successfully', data: { user } });
    }
    catch (error) {
        console.error(error);
        return response({ res, statusCode: 500, message: 'Internal server error' });
    }
}

const logout = (req, res) => {
    try {
        res.cookie("authToken", "", { expires: new Date(0) });
        return response({ res, statusCode: 200, message: 'Logout successful' });
    }
    catch (error) {
        console.error(error);
        return response({ res, statusCode: 500, message: 'Internal server error' });
    }
}

const getAllUsers = async (req, res) => {
    const loggedInUser = req.user.id;
    try {
        const users = await User.find({ _id: { $ne: loggedInUser } }).select(
            "username profilePicture lastSeen isOnline about phoneNumber phoneSuffix"
        ).lean();

        const userWithConversation = await Promise.all(
            users.map(async (user) => {
                const conversation = await Conversation.findOne({
                    participants: { $all: [loggedInUser, user?._id] }
                }).populate({
                    path: "lastMessage",
                    select: ' content Created sender receiver'
                }).lean();
                return {
                    ...user,
                    conversation: conversation || null
                };
            })
        );
        return response({ res, statusCode: 200, message: 'Users retrieved successfully', data: { users: userWithConversation } });
    } catch (error) {
        console.error(error);
        return response({ res, statusCode: 500, message: 'Internal server error' });
    }
}

module.exports = { sendOTP, verifyOTP,updateProfile,logout,checkAuthenticated,getAllUsers };