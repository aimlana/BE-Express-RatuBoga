const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.post('/resend-otp', authController.resendOTP);
router.post('/verify-otp', authController.verifyOTP);
router.post('/update-email', authController.updateEmail);

// Protected routes
router.post('/logout', authController.verifyToken, authController.logout);
router.put(
  '/profile',
  authController.verifyToken,
  authController.updateProfile
);
router.get('/verify', authController.verifyToken, authController.verifyAuth);

module.exports = router;
