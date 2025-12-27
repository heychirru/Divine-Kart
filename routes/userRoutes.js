import express from 'express';
import { createUser, forgotPasswordController, loginUser, refreshToken, resetpassword, updateUserDetails, userDetails, verifyForgotPasswordOtp } from '../controllers/userController.js';
import auth from '../middleware/auth.js';
import { validateLogin, validateRegister, validateUpdateUser } from '../middleware/validation.js';

const userRouter = express.Router();

userRouter.post('/register', validateRegister, createUser);
userRouter.post('/login', validateLogin, loginUser);
userRouter.put('/update-user', auth, validateUpdateUser, updateUserDetails)
userRouter.put('/forgot-password', validateLogin, forgotPasswordController)
userRouter.put('/verify-forgot-password-otp', validateLogin, verifyForgotPasswordOtp)
userRouter.put('/reset-password', validateLogin, resetpassword)
userRouter.post('/refresh-token', refreshToken)
userRouter.get('/user-details', auth, userDetails)


export default userRouter