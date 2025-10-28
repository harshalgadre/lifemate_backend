const User = require('../models/User');
const Employer = require('../models/Employer');
const Job = require('../models/Job');
const Application = require('../models/Application');
const { successResponse, errorResponse, notFoundResponse, validationErrorResponse } = require('../utils/response');

// GET /api/admin/users
exports.listUsers = async (req, res) => {
  try {
    const { q, role, isActive, isBlocked, page = 1, limit = 20 } = req.query;
    const filters = {};
    if (role) filters.role = role;
    if (isActive !== undefined) filters.isActive = isActive === 'true';
    if (isBlocked !== undefined) filters.isBlocked = isBlocked === 'true';
    if (q) {
      filters.$or = [
        { email: new RegExp(q, 'i') },
        { firstName: new RegExp(q, 'i') },
        { lastName: new RegExp(q, 'i') },
      ];
    }
    const skip = (Math.max(1, parseInt(page)) - 1) * Math.min(100, parseInt(limit));
    const lim = Math.min(100, parseInt(limit));

    const [items, total] = await Promise.all([
      User.find(filters).select('-password').sort('-createdAt').skip(skip).limit(lim),
      User.countDocuments(filters),
    ]);

    return successResponse(res, 200, 'Users fetched', { items, total, page: Number(page), limit: lim });
  } catch (err) {
    console.error('Admin list users error:', err);
    return errorResponse(res, 500, 'Failed to fetch users');
  }
};

// PATCH /api/admin/users/:id/status
exports.updateUserStatus = async (req, res) => {
  try {
    const { isActive, isBlocked } = req.body;
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return notFoundResponse(res, 'User not found');
    if (typeof isActive === 'boolean') user.isActive = isActive;
    if (typeof isBlocked === 'boolean') user.isBlocked = isBlocked;
    await user.save();
    return successResponse(res, 200, 'User status updated', { user });
  } catch (err) {
    console.error('Admin update user status error:', err);
    return errorResponse(res, 500, 'Failed to update user');
  }
};

// PATCH /api/admin/users/:id/role
exports.changeUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    const allowed = ['jobseeker', 'employer', 'admin'];
    if (!allowed.includes(role)) {
      return validationErrorResponse(res, [{ field: 'role', message: 'Invalid role' }]);
    }
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return notFoundResponse(res, 'User not found');
    user.role = role;
    await user.save();
    return successResponse(res, 200, 'User role updated', { user });
  } catch (err) {
    console.error('Admin change role error:', err);
    return errorResponse(res, 500, 'Failed to change role');
  }
};

// GET /api/admin/employers
exports.listEmployers = async (req, res) => {
  try {
    const { isVerified, q, page = 1, limit = 20 } = req.query;
    const filters = {};
    if (isVerified !== undefined) filters['verification.isVerified'] = isVerified === 'true';
    if (q) {
      filters.$or = [
        { organizationName: new RegExp(q, 'i') },
        { 'address.city': new RegExp(q, 'i') },
        { 'address.state': new RegExp(q, 'i') },
      ];
    }
    const skip = (Math.max(1, parseInt(page)) - 1) * Math.min(100, parseInt(limit));
    const lim = Math.min(100, parseInt(limit));

    const [items, total] = await Promise.all([
      Employer.find(filters).sort('-createdAt').skip(skip).limit(lim),
      Employer.countDocuments(filters),
    ]);

    return successResponse(res, 200, 'Employers fetched', { items, total, page: Number(page), limit: lim });
  } catch (err) {
    console.error('Admin list employers error:', err);
    return errorResponse(res, 500, 'Failed to fetch employers');
  }
};

// PATCH /api/admin/employers/:id/verify
exports.verifyEmployer = async (req, res) => {
  try {
    const employer = await Employer.findById(req.params.id);
    if (!employer) return notFoundResponse(res, 'Employer not found');
    employer.verification.isVerified = true;
    employer.verification.verifiedAt = new Date();
    employer.verification.verifiedBy = req.user._id;
    await employer.save();
    return successResponse(res, 200, 'Employer verified', { employer });
  } catch (err) {
    console.error('Admin verify employer error:', err);
    return errorResponse(res, 500, 'Failed to verify employer');
  }
};

// PATCH /api/admin/employers/:id/unverify
exports.unverifyEmployer = async (req, res) => {
  try {
    const employer = await Employer.findById(req.params.id);
    if (!employer) return notFoundResponse(res, 'Employer not found');
    employer.verification.isVerified = false;
    employer.verification.verifiedAt = undefined;
    employer.verification.verifiedBy = undefined;
    await employer.save();
    return successResponse(res, 200, 'Employer unverified', { employer });
  } catch (err) {
    console.error('Admin unverify employer error:', err);
    return errorResponse(res, 500, 'Failed to unverify employer');
  }
};

// GET /api/admin/stats
exports.getStats = async (req, res) => {
  try {
    const [users, employers, jobs, applications] = await Promise.all([
      User.countDocuments({}),
      Employer.countDocuments({}),
      Job.countDocuments({}),
      Application.countDocuments({}),
    ]);
    return successResponse(res, 200, 'Stats fetched', {
      users,
      employers,
      jobs,
      applications,
    });
  } catch (err) {
    console.error('Admin get stats error:', err);
    return errorResponse(res, 500, 'Failed to fetch stats');
  }
};
