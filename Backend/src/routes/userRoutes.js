import express from 'express';
import rateLimit from 'express-rate-limit';
import { forgotPasswordController, refreshToken, requestEmailUpdate, resetpassword, sendLoginOtp, updateUserDetails, userDetails, verifyEmailUpdate, verifyForgotPasswordOtp, verifyLoginOtp } from '../controllers/userController.js';
import auth from '../middleware/auth.js';
import { validateForgotPassword, validateLoginOtpVerification, validateOtpVerification, validateResetPassword, validateSendLoginOtp, validateUpdateUser } from '../middleware/validation.js';

const userRouter = express.Router();

// Strict limiter only for OTP-SENDING routes (prevents OTP spamming/brute-force)
const otpSendLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    message: { success: false, message: 'Too many OTP requests. Please wait 15 minutes before trying again.' }
});

userRouter.post('/send-login-otp', otpSendLimiter, validateSendLoginOtp, sendLoginOtp);
userRouter.post('/verify-login-otp', validateLoginOtpVerification, verifyLoginOtp);
userRouter.put('/update-user', auth, validateUpdateUser, updateUserDetails)
userRouter.post('/forgot-password', otpSendLimiter, validateForgotPassword, forgotPasswordController)
userRouter.post('/verify-forgot-password-otp', validateOtpVerification, verifyForgotPasswordOtp)
userRouter.post('/reset-password', validateResetPassword, resetpassword)
userRouter.post('/refresh-token', refreshToken)
userRouter.get('/user-details', auth, userDetails)
userRouter.post('/request-email-update', auth, requestEmailUpdate)
userRouter.post('/verify-email-update', auth, verifyEmailUpdate)


export default userRouter