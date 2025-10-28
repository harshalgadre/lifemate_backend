const Job = require('../models/Job');
const Employer = require('../models/Employer');
const { successResponse, errorResponse, validationErrorResponse, notFoundResponse } = require('../utils/response');

// Build filters for listing
const buildJobFilters = (q) => {
  const f = {};
  if (q.status) f.status = q.status;
  if (q.specialization) f.specialization = q.specialization;
  if (q.city) f['location.city'] = q.city;
  if (q.state) f['location.state'] = q.state;
  if (q.country) f['location.country'] = q.country;
  if (q.jobType) f.jobType = q.jobType;
  if (q.shift) f.shift = q.shift;
  if (q.isRemote !== undefined) f.isRemote = q.isRemote === 'true';
  if (q.experienceMin) f['experienceRequired.minYears'] = { $lte: Number(q.experienceMin) };
  if (q.experienceMax) f['experienceRequired.maxYears'] = { $gte: Number(q.experienceMax) };
  if (q.dateFrom || q.dateTo) {
    f.postedAt = {};
    if (q.dateFrom) f.postedAt.$gte = new Date(q.dateFrom);
    if (q.dateTo) f.postedAt.$lte = new Date(q.dateTo);
  }
  if (q.search) f.$text = { $search: q.search };
  return f;
};

// GET /jobs
exports.list = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 10);
    const skip = (page - 1) * limit;

    const filters = buildJobFilters(req.query);
    const sort = req.query.sort || '-postedAt';

    const [items, total] = await Promise.all([
      Job.find(filters).sort(sort).skip(skip).limit(limit),
      Job.countDocuments(filters),
    ]);

    return successResponse(res, 200, 'Jobs fetched', {
      items,
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error('List jobs error:', err);
    return errorResponse(res, 500, 'Failed to fetch jobs');
  }
};

// GET /jobs/:id
exports.getById = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return notFoundResponse(res, 'Job not found');

    // increment views (non-blocking)
    job.incViews().catch(() => {});

    return successResponse(res, 200, 'Job fetched', { job });
  } catch (err) {
    console.error('Get job error:', err);
    return errorResponse(res, 500, 'Failed to fetch job');
  }
};

// POST /jobs (employer)
exports.create = async (req, res) => {
  try {
    const employer = await Employer.findOne({ user: req.user._id });
    if (!employer) return errorResponse(res, 403, 'Employer profile not found');

    const payload = req.body;
    payload.employer = employer._id;

    // snapshot org name if provided in employer
    payload.organizationName = employer.organizationName;
    if (!payload.location) {
      payload.location = {
        city: employer.address.city,
        state: employer.address.state,
        country: employer.address.country,
      };
    }

    const job = await Job.create(payload);
    return successResponse(res, 201, 'Job created', { job });
  } catch (err) {
    console.error('Create job error:', err);
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(e => ({ field: e.path, message: e.message }));
      return validationErrorResponse(res, errors);
    }
    return errorResponse(res, 500, 'Failed to create job');
  }
};

// PATCH /jobs/:id (employer)
exports.update = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return notFoundResponse(res, 'Job not found');
    // only owner  admin
    if (req.user.role !== 'admin') {
      const employer = await Employer.findOne({ user: req.user._id });
      if (!employer || job.employer.toString() !== employer._id.toString()) {
        return errorResponse(res, 403, 'Not authorized to update this job');
      }
    }

    Object.assign(job, req.body);
    await job.save();
    return successResponse(res, 200, 'Job updated', { job });
  } catch (err) {
    console.error('Update job error:', err);
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(e => ({ field: e.path, message: e.message }));
      return validationErrorResponse(res, errors);
    }
    return errorResponse(res, 500, 'Failed to update job');
  }
};

// PATCH /jobs/:id/status (employer/admin)
exports.changeStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const job = await Job.findById(req.params.id);
    if (!job) return notFoundResponse(res, 'Job not found');

    if (req.user.role !== 'admin') {
      const employer = await Employer.findOne({ user: req.user._id });
      if (!employer || job.employer.toString() !== employer._id.toString()) {
        return errorResponse(res, 403, 'Not authorized to change status');
      }
    }

    job.status = status;
    await job.save();
    return successResponse(res, 200, 'Status updated', { job });
  } catch (err) {
    console.error('Change status error:', err);
    return errorResponse(res, 500, 'Failed to change status');
  }
};

// DELETE /jobs/:id (employer/admin) -> soft archive
exports.remove = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return notFoundResponse(res, 'Job not found');

    if (req.user.role !== 'admin') {
      const employer = await Employer.findOne({ user: req.user._id });
      if (!employer || job.employer.toString() !== employer._id.toString()) {
        return errorResponse(res, 403, 'Not authorized to delete');
      }
    }

    job.status = 'Archived';
    await job.save();
    return successResponse(res, 200, 'Job archived');
  } catch (err) {
    console.error('Delete job error:', err);
    return errorResponse(res, 500, 'Failed to delete job');
  }
};
