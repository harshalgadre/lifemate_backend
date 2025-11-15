const Employer = require('../models/Employer');
const { successResponse, errorResponse, validationErrorResponse, notFoundResponse, getPaginationMeta } = require('../utils/response');

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

// GET /api/employer/profile/refresh - Refetch and sync stats with database
exports.refreshProfile = async (req, res) => {
  try {
    const employer = await Employer.findOne({ user: req.user._id });
    if (!employer) return notFoundResponse(res, 'Employer profile not found');

    // Sync all stats from database
    await employer.syncActiveJobStats();
    await employer.syncAllStats();

    // Fetch fresh copy
    const updated = await Employer.findById(employer._id);
    return successResponse(res, 200, 'Employer profile refreshed with latest stats', { employer: updated });
  } catch (err) {
    console.error('Refresh employer profile error:', err);
    return errorResponse(res, 500, 'Failed to refresh employer profile');
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

// GET /api/employer/all - Browse all employers (for jobseekers)
exports.getAllEmployers = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 12, 
      search = '', 
      organizationType = '',
      city = '',
      state = '',
      specialization = '',
      verified = '',
      sortBy = 'createdAt',
      order = 'desc'
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build filter query
    const filter = {};

    // Search by organization name or description
    if (search) {
      filter.$or = [
        { organizationName: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Filter by organization type
    if (organizationType) {
      filter.organizationType = organizationType;
    }

    // Filter by location
    if (city) {
      filter['address.city'] = { $regex: city, $options: 'i' };
    }
    if (state) {
      filter['address.state'] = { $regex: state, $options: 'i' };
    }

    // Filter by specialization
    if (specialization) {
      filter.specializations = specialization;
    }

    // Filter by verification status
    if (verified === 'true') {
      filter['verification.isVerified'] = true;
    } else if (verified === 'false') {
      filter['verification.isVerified'] = false;
    }

    // Build sort object
    const sortOrder = order === 'asc' ? 1 : -1;
    const sortOptions = {};
    
    switch (sortBy) {
      case 'name':
        sortOptions.organizationName = sortOrder;
        break;
      case 'jobs':
        sortOptions['stats.activeJobPosts'] = sortOrder;
        break;
      case 'views':
        sortOptions['stats.profileViews'] = sortOrder;
        break;
      default:
        sortOptions.createdAt = sortOrder;
    }

    // Execute query with pagination
    const [employers, total] = await Promise.all([
      Employer.find(filter)
        .populate({ 
          path: 'user', 
          select: 'firstName lastName email phone profileImage isActive' 
        })
        .select('-verification.documents -settings -subscription.features')
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Employer.countDocuments(filter)
    ]);

    // Increment profile views for each employer (async, don't wait)
    if (employers.length > 0) {
      const employerIds = employers.map(e => e._id);
      Employer.updateMany(
        { _id: { $in: employerIds } },
        { $inc: { 'stats.profileViews': 1 } }
      ).exec().catch(err => console.error('Failed to update profile views:', err));
    }

    const meta = getPaginationMeta(pageNum, limitNum, total);

    return successResponse(res, 200, 'Employers fetched successfully', { employers }, meta);
  } catch (err) {
    console.error('Get all employers error:', err);
    return errorResponse(res, 500, 'Failed to fetch employers');
  }
};

// GET /api/employer/:id - Get single employer profile by ID (for jobseekers)
exports.getEmployerById = async (req, res) => {
  try {
    const employer = await Employer.findById(req.params.id)
      .populate({ 
        path: 'user', 
        select: 'firstName lastName email phone profileImage isActive' 
      })
      .select('-verification.documents -settings')
      .lean();

    if (!employer) {
      return notFoundResponse(res, 'Employer not found');
    }

    // Increment profile view count (async)
    Employer.findByIdAndUpdate(
      req.params.id,
      { $inc: { 'stats.profileViews': 1 } }
    ).exec().catch(err => console.error('Failed to update profile view:', err));

    return successResponse(res, 200, 'Employer profile fetched', { employer });
  } catch (err) {
    console.error('Get employer by ID error:', err);
    return errorResponse(res, 500, 'Failed to fetch employer profile');
  }
};
