const User = require('../models/User');
const JobSeeker = require('../models/JobSeeker');
const Employer = require('../models/Employer');
const { generateTokens, verifyRefreshToken } = require('../utils/jwt');
const { successResponse, errorResponse, validationErrorResponse, unauthorizedResponse } = require('../utils/response');
const emailService = require('../services/emailService');

/**
 * Authentication Controller
 * Handles user registration, login, logout, and token management
 */


/**
 * Register a new user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const register = async (req, res) => {
  try {
    const { email, password, firstName, lastName, role, phone } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return errorResponse(res, 400, 'User already exists with this email address.');
    }

    // Create new user
    const user = await User.create({
      email,
      password,
      firstName,
      lastName,
      role,
      phone,
    });

    // Generate email verification token
    const verificationToken = user.generateEmailVerificationToken();
    await user.save();

    // Create role-specific profile
    if (role === 'jobseeker') {
      await JobSeeker.create({ user: user._id });
    }

    // Send verification email
    try {
      await emailService.sendVerificationEmail(user.email, verificationToken, user.firstName);
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      // Don't fail registration if email fails
    }

    // Generate tokens
    const tokens = generateTokens(user._id, user.role);

    // Add refresh token to user
    await user.addRefreshToken(tokens.refreshToken);

    // Remove sensitive data
    const userResponse = {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      phone: user.phone,
      isEmailVerified: user.isEmailVerified,
      createdAt: user.createdAt,
    };

    return successResponse(
      res,
      201,
      'User registered successfully. Please check your email for verification.',
      {
        user: userResponse,
        tokens,
      }
    );
  } catch (error) {
    console.error('Registration error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message,
      }));
      return validationErrorResponse(res, errors);
    }

    return errorResponse(res, 500, 'Registration failed. Please try again.');
  }
};

/**
 * Login user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user and include password for comparison
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      return unauthorizedResponse(res, 'Invalid email or password.');
    }

    // Check if account is locked
    if (user.isLocked) {
      return unauthorizedResponse(res, 'Account is temporarily locked due to multiple failed login attempts. Please try again later.');
    }

    // Check if account is blocked
    if (user.isBlocked) {
      return unauthorizedResponse(res, 'Account is blocked. Please contact support.');
    }

    // Check if account is active
    if (!user.isActive) {
      return unauthorizedResponse(res, 'Account is deactivated. Please contact support.');
    }

    // Compare password
    const isPasswordValid = await user.comparePassword(password);
    
    if (!isPasswordValid) {
      // Increment login attempts
      await user.incLoginAttempts();
      return unauthorizedResponse(res, 'Invalid email or password.');
    }

    // Reset login attempts on successful login
    await user.resetLoginAttempts();

    // Generate tokens
    const tokens = generateTokens(user._id, user.role);

    // Add refresh token to user
    await user.addRefreshToken(tokens.refreshToken);

    // Remove sensitive data
    const userResponse = {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      phone: user.phone,
      profileImage: user.profileImage,
      isEmailVerified: user.isEmailVerified,
      lastLogin: user.lastLogin,
    };

    // Set refresh token as HTTP-only cookie
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    return successResponse(res, 200, 'Login successful', {
      user: userResponse,
      accessToken: tokens.accessToken,
    });
  } catch (error) {
    console.error('Login error:', error);
    return errorResponse(res, 500, 'Login failed. Please try again.');
  }
};

/**
 * Logout user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const tokenFromCookie = req.cookies.refreshToken;

    // Get the refresh token from body or cookie
    const token = refreshToken || tokenFromCookie;

    if (token) {
      // Remove refresh token from user's token list
      await req.user.removeRefreshToken(token);
    }

    // Clear refresh token cookie
    res.clearCookie('refreshToken');

    return successResponse(res, 200, 'Logout successful');
  } catch (error) {
    console.error('Logout error:', error);
    return errorResponse(res, 500, 'Logout failed. Please try again.');
  }
};

/**
 * Refresh access token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const tokenFromCookie = req.cookies.refreshToken;

    // Get the refresh token from body or cookie
    const token = refreshToken || tokenFromCookie;

    if (!token) {
      return unauthorizedResponse(res, 'Refresh token not provided.');
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(token);

    // Find user
    const user = await User.findById(decoded.userId);
    if (!user) {
      return unauthorizedResponse(res, 'Invalid refresh token.');
    }

    // Check if refresh token exists in user's token list
    const tokenExists = user.refreshTokens.some(t => t.token === token);
    if (!tokenExists) {
      return unauthorizedResponse(res, 'Invalid refresh token.');
    }

    // Check if user is still active
    if (!user.isActive || user.isBlocked || user.isLocked) {
      return unauthorizedResponse(res, 'Account is not active.');
    }

    // Generate new tokens
    const tokens = generateTokens(user._id, user.role);

    // Remove old refresh token and add new one
    await user.removeRefreshToken(token);
    await user.addRefreshToken(tokens.refreshToken);

    // Set new refresh token as HTTP-only cookie
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    return successResponse(res, 200, 'Token refreshed successfully', {
      accessToken: tokens.accessToken,
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    
    if (error.name === 'TokenExpiredError') {
      return unauthorizedResponse(res, 'Refresh token has expired. Please login again.');
    } else if (error.name === 'JsonWebTokenError') {
      return unauthorizedResponse(res, 'Invalid refresh token.');
    }

    return errorResponse(res, 500, 'Token refresh failed. Please try again.');
  }
};

/**
 * Verify email address
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    // Find user by verification token
    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: Date.now() },
    });

    if (!user) {
      return errorResponse(res, 400, 'Invalid or expired verification token.');
    }

    // Update user verification status
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    return successResponse(res, 200, 'Email verified successfully');
  } catch (error) {
    console.error('Email verification error:', error);
    return errorResponse(res, 500, 'Email verification failed. Please try again.');
  }
};

/**
 * Resend email verification
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const resendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return errorResponse(res, 404, 'User not found.');
    }

    if (user.isEmailVerified) {
      return errorResponse(res, 400, 'Email is already verified.');
    }

    // Generate new verification token
    const verificationToken = user.generateEmailVerificationToken();
    await user.save();

    // Send verification email
    try {
      await emailService.sendVerificationEmail(user.email, verificationToken, user.firstName);
      return successResponse(res, 200, 'Verification email sent successfully');
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      return errorResponse(res, 500, 'Failed to send verification email. Please try again.');
    }
  } catch (error) {
    console.error('Resend verification error:', error);
    return errorResponse(res, 500, 'Failed to resend verification email. Please try again.');
  }
};

/**
 * Forgot password
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if email exists or not for security
      return successResponse(res, 200, 'If the email exists, a password reset link has been sent.');
    }

    // Generate password reset token
    const resetToken = user.generatePasswordResetToken();
    await user.save();

    // Send password reset email
    try {
      await emailService.sendPasswordResetEmail(user.email, resetToken, user.firstName);
      return successResponse(res, 200, 'If the email exists, a password reset link has been sent.');
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      return errorResponse(res, 500, 'Failed to send password reset email. Please try again.');
    }
  } catch (error) {
    console.error('Forgot password error:', error);
    return errorResponse(res, 500, 'Password reset request failed. Please try again.');
  }
};

/**
 * Reset password
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    // Find user by reset token
    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: Date.now() },
    }).select('+password');

    if (!user) {
      return errorResponse(res, 400, 'Invalid or expired password reset token.');
    }

    // Update password
    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    // Clear all refresh tokens for security
    await user.clearAllRefreshTokens();

    return successResponse(res, 200, 'Password reset successfully');
  } catch (error) {
    console.error('Password reset error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message,
      }));
      return validationErrorResponse(res, errors);
    }

    return errorResponse(res, 500, 'Password reset failed. Please try again.');
  }
};

/**
 * Get current user profile
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password -refreshTokens');
    
    if (!user) {
      return errorResponse(res, 404, 'User not found.');
    }

    return successResponse(res, 200, 'Profile retrieved successfully', { user });
  } catch (error) {
    console.error('Get profile error:', error);
    return errorResponse(res, 500, 'Failed to retrieve profile. Please try again.');
  }
};

/**
 * Update user profile
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, phone, profileImage } = req.body;
    
    const user = await User.findById(req.user._id);
    if (!user) {
      return errorResponse(res, 404, 'User not found.');
    }

    // Update allowed fields
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (phone) user.phone = phone;
    if (profileImage) user.profileImage = profileImage;

    await user.save();

    // Remove sensitive data
    const userResponse = {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      phone: user.phone,
      profileImage: user.profileImage,
      isEmailVerified: user.isEmailVerified,
      updatedAt: user.updatedAt,
    };

    return successResponse(res, 200, 'Profile updated successfully', { user: userResponse });
  } catch (error) {
    console.error('Update profile error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message,
      }));
      return validationErrorResponse(res, errors);
    }

    return errorResponse(res, 500, 'Profile update failed. Please try again.');
  }
};

/**
 * Change password
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
      return errorResponse(res, 404, 'User not found.');
    }

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return errorResponse(res, 400, 'Current password is incorrect.');
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Clear all refresh tokens for security
    await user.clearAllRefreshTokens();

    return successResponse(res, 200, 'Password changed successfully');
  } catch (error) {
    console.error('Change password error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message,
      }));
      return validationErrorResponse(res, errors);
    }

    return errorResponse(res, 500, 'Password change failed. Please try again.');
  }
};

/**
 * Handle Google OAuth Login/Registration
 * This is called by the Passport Google strategy.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const googleLogin = async (req, res) => {
  try {
    if (!req.user) {
      return errorResponse(res, 400, 'Google user profile not found.');
    }

    const { _id, role } = req.user;

    // Generate tokens
    const tokens = generateTokens(_id, role);

    // Add refresh token to user
    await req.user.addRefreshToken(tokens.refreshToken);

    // Set refresh token as HTTP-only cookie
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    // Prepare user response
    const userResponse = {
      id: req.user._id,
      email: req.user.email,
      firstName: req.user.firstName,
      lastName: req.user.lastName,
      role: req.user.role,
      phone: req.user.phone,
      profileImage: req.user.profileImage,
      isEmailVerified: req.user.isEmailVerified,
      lastLogin: req.user.lastLogin,
    };

    // This endpoint is typically not called directly by the frontend.
    // The oauthController redirects. However, if it were, this would be the response.
    return successResponse(res, 200, 'Google login successful', {
      user: userResponse,
      accessToken: tokens.accessToken,
    });
  } catch (error) {
    console.error('Google login handler error:', error);
    return errorResponse(res, 500, 'Google login failed.');
  }
};

/**
 * This function is designed to be used as the callback for the Passport Google strategy.
 * It finds a user by their Google ID or creates a new one.
 */
const findOrCreateGoogleUser = async (accessToken, refreshToken, profile, done) => {
  try {
    // 1. Find user by googleId
    let user = await User.findOne({ googleId: profile.id });

    if (user) {
      return done(null, user); // User found, login
    }

    // 2. If no user, create one
    const role = profile.state || 'jobseeker'; // 'state' is passed from the initial auth request
    user = await User.create({
      googleId: profile.id,
      email: profile.emails[0].value,
      firstName: profile.name.givenName,
      lastName: profile.name.familyName,
      profileImage: profile.photos[0].value,
      isEmailVerified: true, // Email from Google is considered verified
      role: role,
    });

    if (role === 'jobseeker') {
      await JobSeeker.create({ user: user._id });
    }

    return done(null, user); // New user created and logged in
  } catch (error) {
    return done(error, false);
  }
};

module.exports = {
  register,
  login,
  logout,
  refreshToken,
  verifyEmail,
  resendVerificationEmail,
  forgotPassword,
  resetPassword,
  getProfile,
  updateProfile,
  changePassword,
  googleLogin,
  findOrCreateGoogleUser,
};
