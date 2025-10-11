const express = require('express');
const router = express.Router();
const passport = require('passport');
const { successResponse, errorResponse } = require('../utils/response');

// Start Google OAuth flow
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

// Google OAuth callback
router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/auth/google/failure' }),
  (req, res) => {
    try {
      // Issue JWT tokens for the authenticated user
      const accessToken = req.user.generateAccessToken();
      const refreshToken = req.user.generateRefreshToken();
      
      // Save refresh token
      req.user.addRefreshToken(refreshToken).catch(() => {});

      // Option 1: redirect back to frontend with tokens in query (safer to set cookies server-side)
      const redirectUrl = new URL(process.env.OAUTH_SUCCESS_REDIRECT || `${process.env.FRONTEND_URL}/oauth/success`);
      redirectUrl.searchParams.set('accessToken', accessToken);
      redirectUrl.searchParams.set('refreshToken', refreshToken);
      redirectUrl.searchParams.set('role', req.user.role);
      
      return res.redirect(redirectUrl.toString());
    } catch (error) {
      return res.redirect(process.env.OAUTH_FAILURE_REDIRECT || `${process.env.FRONTEND_URL}/oauth/failure`);
    }
  }
);

router.get('/google/failure', (req, res) => {
  return errorResponse(res, 401, 'Google OAuth failed');
});

module.exports = router;


