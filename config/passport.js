const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');
const JobSeeker = require('../models/JobSeeker');

// Configure Google OAuth strategy (stateless)
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL,
  passReqToCallback: true,
}, async (req, accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.emails && profile.emails[0] && profile.emails[0].value;
    const googleId = profile.id;

    if (!email) {
      return done(null, false, { message: 'Google account does not have a public email' });
    }

    // Find existing user by providerId or email
    let user = await User.findOne({ $or: [
      { oauthProvider: 'google', oauthId: googleId },
      { email }
    ] });

    if (!user) {
      // Read role from OAuth state set in routes/oauth.js
      const stateRole = (req.query && req.query.state ? String(req.query.state) : '').toLowerCase();
      const role = ['jobseeker', 'employer'].includes(stateRole) ? stateRole : 'jobseeker';

      // Create new user with selected role
      user = await User.create({
        email,
        // No password for OAuth users
        role,
        firstName: profile.name && profile.name.givenName ? profile.name.givenName : 'User',
        lastName: profile.name && profile.name.familyName ? profile.name.familyName : 'Google',
        isEmailVerified: true,
        oauthProvider: 'google',
        oauthId: googleId,
        profileImage: profile.photos && profile.photos[0] && profile.photos[0].value ? profile.photos[0].value : null,
      });

      // Create JobSeeker profile only if role is jobseeker
      if (role === 'jobseeker') {
        await JobSeeker.create({ user: user._id });
      }
    } else {
      // Link google if not already
      if (!user.oauthProvider || !user.oauthId) {
        user.oauthProvider = 'google';
        user.oauthId = googleId;
        user.isEmailVerified = true;
        await user.save();
      }
    }

    return done(null, user);
  } catch (error) {
    return done(error, null);
  }
}));

// No sessions used
module.exports = passport;


