const jwt = require('jsonwebtoken');

/**
 * JWT utility functions for token generation and verification
 * Handles access tokens, refresh tokens, and token validation
 */

/**
 * Generate JWT access token
 * @param {string} userId - User ID
 * @param {string} role - User role (jobseeker, employer, admin)
 * @returns {string} JWT token
 */
const generateAccessToken = (userId, role) => {
  return jwt.sign(
    { userId, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

/**
 * Generate JWT refresh token
 * @param {string} userId - User ID
 * @returns {string} JWT refresh token
 */
const generateRefreshToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRE || '30d' }
  );
};

/**
 * Generate both access and refresh tokens
 * @param {string} userId - User ID
 * @param {string} role - User role
 * @returns {Object} Object containing access and refresh tokens
 */
const generateTokens = (userId, role) => {
  return {
    accessToken: generateAccessToken(userId, role),
    refreshToken: generateRefreshToken(userId),
  };
};

/**
 * Verify JWT access token
 * @param {string} token - JWT token to verify
 * @returns {Object} Decoded token payload
 */
const verifyAccessToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

/**
 * Verify JWT refresh token
 * @param {string} token - JWT refresh token to verify
 * @returns {Object} Decoded token payload
 */
const verifyRefreshToken = (token) => {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
};

/**
 * Decode JWT token without verification (for debugging)
 * @param {string} token - JWT token to decode
 * @returns {Object} Decoded token payload
 */
const decodeToken = (token) => {
  return jwt.decode(token);
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  generateTokens,
  verifyAccessToken,
  verifyRefreshToken,
  decodeToken,
};
