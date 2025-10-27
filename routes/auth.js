const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate, requireEmailVerification } = require('../middlewares/auth');
const passport = require('passport');
const { validateRegistration, validateLogin, validatePasswordReset, validatePasswordChange } = require('../middlewares/validation');
const oauthController = require('../controllers/oauthController');

/**
 * Authentication Routes
 * Handles user registration, login, logout, and account management
 */

// Public routes (no authentication required)
router.post('/register', validateRegistration, authController.register);
router.post('/login', validateLogin, authController.login);
router.post('/logout', authController.logout);
router.post('/refresh-token', authController.refreshToken);
router.get('/verify-email/:token', authController.verifyEmail);
router.post('/resend-verification', authController.resendVerificationEmail);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password/:token', validatePasswordReset, authController.resetPassword);

// Protected routes (authentication required)
router.get('/profile', authenticate, authController.getProfile);
router.put('/profile', authenticate, authController.updateProfile);
router.put('/change-password', authenticate, validatePasswordChange, authController.changePassword);

// OAuth route aliases (mirror /api/oauth/* under /api/auth/*)
router.get('/google', oauthController.startGoogle);
router.get('/google/callback', oauthController.googleCallback);
router.get('/google/failure', oauthController.googleFailure);

module.exports = router;
