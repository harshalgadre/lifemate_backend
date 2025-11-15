const Job = require("../models/Job");
const Employer = require("../models/Employer");
const {
  successResponse,
  errorResponse,
  validationErrorResponse,
  notFoundResponse,
} = require("../utils/response");

// Build filters for listing
const buildJobFilters = (q) => {
  const f = {};
  if (q.status) f.status = q.status;
  if (q.specialization) f.specialization = q.specialization;
  if (q.city) f["location.city"] = q.city;
  if (q.state) f["location.state"] = q.state;
  if (q.country) f["location.country"] = q.country;
  if (q.jobType) f.jobType = q.jobType;
  if (q.shift) f.shift = q.shift;
  if (q.isRemote !== undefined) f.isRemote = q.isRemote === "true";
  if (q.experienceMin)
    f["experienceRequired.minYears"] = { $lte: Number(q.experienceMin) };
  if (q.experienceMax)
    f["experienceRequired.maxYears"] = { $gte: Number(q.experienceMax) };
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
    const sort = req.query.sort || "-postedAt";
    if (!req.query.includeArchived) {
      filters.status = { $ne: "Archived" };
    }

    const [items, total] = await Promise.all([
      Job.find(filters).sort(sort).skip(skip).limit(limit),
      Job.countDocuments(filters),
    ]);

    return successResponse(res, 200, "Jobs fetched", {
      items,
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("List jobs error:", err);
    return errorResponse(res, 500, "Failed to fetch jobs");
  }
};

// GET /jobs/my (employer) -> list only jobs created by the authenticated employer
exports.listByEmployer = async (req, res) => {
  try {
    // find employer profile for the authenticated user
    const employer = await Employer.findOne({ user: req.user._id });
    if (!employer) return errorResponse(res, 403, 'Employer profile not found');

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 10);
    const skip = (page - 1) * limit;

    const filters = buildJobFilters(req.query);
    // limit to this employer's jobs only
    filters.employer = employer._id;

    const sort = req.query.sort || '-postedAt';
    if (!req.query.includeArchived) {
      filters.status = { $ne: 'Archived' };
    }

    const [items, total] = await Promise.all([
      Job.find(filters).sort(sort).skip(skip).limit(limit),
      Job.countDocuments(filters),
    ]);

    return successResponse(res, 200, 'Employer jobs fetched', {
      items,
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error('List employer jobs error:', err);
    return errorResponse(res, 500, 'Failed to fetch employer jobs');
  }
};

// GET /jobs/:id
exports.getById = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return notFoundResponse(res, "Job not found");

    // increment views (non-blocking)
    job.incViews().catch(() => {});

    return successResponse(res, 200, "Job fetched", { job });
  } catch (err) {
    console.error("Get job error:", err);
    return errorResponse(res, 500, "Failed to fetch job");
  }
};

// POST /jobs (employer)
exports.create = async (req, res) => {
  try {
    const employer = await Employer.findOne({ user: req.user._id });
    if (!employer) return errorResponse(res, 403, "Employer profile not found");

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

    // Update employer's job stats
    await employer.updateJobStats(1);
    // Only count as active if job status is 'Active' (default is 'Pending')
    if (job.status === 'Active') {
      await employer.updateActiveJobStats(1);
    }

    return successResponse(res, 201, "Job created", { job });
  } catch (err) {
    console.error("Create job error:", err);
    if (err.name === "ValidationError") {
      const errors = Object.values(err.errors).map((e) => ({
        field: e.path,
        message: e.message,
      }));
      return validationErrorResponse(res, errors);
    }
    return errorResponse(res, 500, "Failed to create job");
  }
};

// PATCH /jobs/:id (employer)
exports.update = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return notFoundResponse(res, "Job not found");
    // only owner  admin
    if (req.user.role !== "admin") {
      const employer = await Employer.findOne({ user: req.user._id });
      if (!employer || job.employer.toString() !== employer._id.toString()) {
        return errorResponse(res, 403, "Not authorized to update this job");
      }
    }

    Object.assign(job, req.body);
    await job.save();
    return successResponse(res, 200, "Job updated", { job });
  } catch (err) {
    console.error("Update job error:", err);
    if (err.name === "ValidationError") {
      const errors = Object.values(err.errors).map((e) => ({
        field: e.path,
        message: e.message,
      }));
      return validationErrorResponse(res, errors);
    }
    return errorResponse(res, 500, "Failed to update job");
  }
};

// PATCH /jobs/:id/status (employer/admin)
exports.changeStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const job = await Job.findById(req.params.id);
    if (!job) return notFoundResponse(res, "Job not found");

    let employer;
    if (req.user.role !== "admin") {
      employer = await Employer.findOne({ user: req.user._id });
      if (!employer || job.employer.toString() !== employer._id.toString()) {
        return errorResponse(res, 403, "Not authorized to change status");
      }
    } else {
      employer = await Employer.findById(job.employer);
    }

    const oldStatus = job.status;
    job.status = status;
    await job.save();

    // Update active job stats if the status change affects it
    if (oldStatus !== status) {
      // If transitioning TO 'Active', increment
      if (status === 'Active' && oldStatus !== 'Active') {
        await employer.updateActiveJobStats(1);
      }
      // If transitioning FROM 'Active' to something else, decrement
      else if (oldStatus === 'Active' && status !== 'Active') {
        await employer.updateActiveJobStats(-1);
      }
    }

    return successResponse(res, 200, "Status updated", { job });
  } catch (err) {
    console.error("Change status error:", err);
    return errorResponse(res, 500, "Failed to change status");
  }
};

// DELETE /jobs/:id (employer/admin) -> soft archive
exports.remove = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return notFoundResponse(res, "Job not found");

    let employer;
    if (req.user.role !== "admin") {
      employer = await Employer.findOne({ user: req.user._id });
      if (!employer || job.employer.toString() !== employer._id.toString()) {
        return errorResponse(res, 403, "Not authorized to delete");
      }
    } else {
      employer = await Employer.findById(job.employer);
    }

    const oldStatus = job.status;
    job.status = "Archived";
    await job.save();

    // Update active job stats if the job was active
    if (oldStatus === 'Active') {
      await employer.updateActiveJobStats(-1);
    }

    return successResponse(res, 200, "Job archived");
  } catch (err) {
    console.error("Delete job error:", err);
    return errorResponse(res, 500, "Failed to delete job");
  }
};
