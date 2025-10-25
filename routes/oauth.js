const express = require('express');
const router = express.Router();
const passport = require('passport');
const { successResponse, errorResponse } = require('../utils/response');
const { generateTokens } = require('../utils/jwt');

// Start Google OAuth flow
router.get('/google', (req, res, next) => {
  const role = (req.query.role || '').toLowerCase();
  const allowed = ['jobseeker', 'employer'];
  const state = allowed.includes(role) ? role : 'jobseeker';
  passport.authenticate('google', { scope: ['profile', 'email'], state })(req, res, next);
});

// Google OAuth callback
router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/auth/google/failure' }),
  async (req, res) => {
    try {
      // Issue JWT tokens for the authenticated user using utility functions
      const tokens = generateTokens(req.user._id, req.user.role);
      
      // Save refresh token
      await req.user.addRefreshToken(tokens.refreshToken);

      // Option 1: redirect back to frontend with tokens in query (safer to set cookies server-side)
      const redirectUrl = new URL(process.env.OAUTH_SUCCESS_REDIRECT || `${process.env.FRONTEND_URL}/oauth/success`);
      redirectUrl.searchParams.set('accessToken', tokens.accessToken);
      redirectUrl.searchParams.set('refreshToken', tokens.refreshToken);
      redirectUrl.searchParams.set('role', req.user.role);
      redirectUrl.searchParams.set('provider', 'google');
      
      return res.redirect(redirectUrl.toString());
    } catch (error) {
      console.error('OAuth callback error:', error);
      return res.redirect(process.env.OAUTH_FAILURE_REDIRECT || `${process.env.FRONTEND_URL}/oauth/failure`);
    }
  }
);

router.get('/google/failure', (req, res) => {
  return errorResponse(res, 401, 'Google OAuth failed');
});

module.exports = router;


