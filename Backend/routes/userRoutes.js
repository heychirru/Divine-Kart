import express from 'express';
import { forgotPasswordController, refreshToken, requestEmailUpdate, resetpassword, sendLoginOtp, updateUserDetails, userDetails, verifyEmailUpdate, verifyForgotPasswordOtp, verifyLoginOtp } from '../controllers/userController.js';
import auth from '../middleware/auth.js';
import { validateForgotPassword, validateLoginOtpVerification, validateOtpVerification, validateResetPassword, validateSendLoginOtp, validateUpdateUser } from '../middleware/validation.js';

const userRouter = express.Router();

userRouter.post('/send-login-otp', validateSendLoginOtp, sendLoginOtp);
userRouter.post('/verify-login-otp', validateLoginOtpVerification, verifyLoginOtp);
userRouter.put('/update-user', auth, validateUpdateUser, updateUserDetails)
userRouter.post('/forgot-password', validateForgotPassword, forgotPasswordController)
userRouter.post('/verify-forgot-password-otp', validateOtpVerification, verifyForgotPasswordOtp)
userRouter.post('/reset-password', validateResetPassword, resetpassword)
userRouter.post('/refresh-token', refreshToken)
userRouter.get('/user-details', auth, userDetails)
userRouter.post('/request-email-update', auth, requestEmailUpdate)
userRouter.post('/verify-email-update', auth, verifyEmailUpdate)


export default userRouter