const express=require('express');
const authController=require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddlware');
const { multerMiddleware } = require('../config/cloudinaryConfig');


const router=express.Router();
router.post('/send-otp', authController.sendOTP);
router.post('/verify-otp', authController.verifyOTP);


//protected routes

router.put('/update-profile',authMiddleware,multerMiddleware,authController.updateProfile)

module.exports=router;