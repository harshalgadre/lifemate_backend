const Employer = require('../models/Employer');
const { successResponse, errorResponse, validationErrorResponse, notFoundResponse } = require('../utils/response');

// GET /api/employer/profile
exports.getMyProfile = async (req, res) => {
  try {
    const employer = await Employer.findOne({ user: req.user._id });
    if (!employer) return notFoundResponse(res, 'Employer profile not found');
    return successResponse(res, 200, 'Employer profile fetched', { employer });
  } catch (err) {
    console.error('Get employer profile error:', err);
    return errorResponse(res, 500, 'Failed to fetch employer profile');
  }
};

// POST /api/employer/profile (create or update in one call)
exports.createOrUpdateProfile = async (req, res) => {
  try {
    const body = req.body;

    let employer = await Employer.findOne({ user: req.user._id });

    if (!employer) {
      employer = new Employer({ ...body, user: req.user._id });
    } else {
      Object.assign(employer, body);
    }

    await employer.save();

    return successResponse(res, 200, 'Employer profile saved', { employer });
  } catch (err) {
    console.error('Save employer profile error:', err);
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(e => ({ field: e.path, message: e.message }));
      return validationErrorResponse(res, errors);
    }
    return errorResponse(res, 500, 'Failed to save employer profile');
  }
};
