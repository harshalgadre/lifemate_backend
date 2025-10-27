const passport = require('passport');
const { generateTokens } = require('../utils/jwt');

// GET /api/oauth/google?role=jobseeker|employer
exports.startGoogle = (req, res, next) => {
  const role = (req.query.role || '').toLowerCase();
  const allowed = ['jobseeker', 'employer'];
  const state = allowed.includes(role) ? role : 'jobseeker';
  passport.authenticate('google', { scope: ['profile', 'email'], state })(req, res, next);
};

// GET /api/oauth/google/callback
exports.googleCallback = [
  passport.authenticate('google', { session: false, failureRedirect: '/auth/google/failure' }),
  async (req, res) => {
    try {
      const tokens = generateTokens(req.user._id, req.user.role);
      await req.user.addRefreshToken(tokens.refreshToken);

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
];

// GET /api/oauth/google/failure
exports.googleFailure = (req, res) => {
  res.status(401).json({ success: false, message: 'Google OAuth failed' });
};
