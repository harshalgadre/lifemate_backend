const Application = require("../models/Application");
const Job = require("../models/Job");
const JobSeeker = require("../models/JobSeeker");
const Employer = require("../models/Employer");
const {
  successResponse,
  errorResponse,
  validationErrorResponse,
  notFoundResponse,
  forbiddenResponse,
} = require("../utils/response");
const { uploadToCloudinary } = require("../config/cloudinary");

// Build filters helper
const buildFilters = (q) => {
  const f = {};
  if (q.status) f.status = q.status;
  if (q.job) f.job = q.job;
  if (q.employer) f.employer = q.employer;
  if (q.jobSeeker) f.jobSeeker = q.jobSeeker;
  if (q.dateFrom || q.dateTo) {
    f.appliedAt = {};
    if (q.dateFrom) f.appliedAt.$gte = new Date(q.dateFrom);
    if (q.dateTo) f.appliedAt.$lte = new Date(q.dateTo);
  }
  return f;
};

// POST /jobs/:id/apply (jobseeker)
exports.apply = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    console.log(job);
    if (!job || !job.isOpen())
      return notFoundResponse(res, "Job not open for applications");

    const jobSeeker = await JobSeeker.findOne({ user: req.user._id });
    if (!jobSeeker)
      return errorResponse(res, 403, "Job seeker profile not found");

    const employer = await Employer.findById(job.employer);
    if (!employer) return errorResponse(res, 400, "Employer not found for job");

    // Normalize body fields for both JSON and multipart
    let coverLetter = req.body.coverLetter;
    if (typeof coverLetter === "string") {
      coverLetter = { text: coverLetter };
    } else if (!coverLetter || typeof coverLetter !== "object") {
      coverLetter = {};
    }

    let answers = req.body.answers;
    if (typeof answers === "string") {
      try {
        answers = JSON.parse(answers);
      } catch {
        answers = [];
      }
    }
    if (!Array.isArray(answers)) answers = [];

    const payload = {
      job: job._id,
      jobSeeker: jobSeeker._id,
      employer: employer._id,
      coverLetter,
      answers,
    };

    // Handle optional file uploads (multer memory storage is used in route)
    if (req.files && req.files.resume && req.files.resume[0]) {
      const file = req.files.resume[0];
      const up = await uploadToCloudinary(
        file.buffer,
        `lifemate/applications/${jobSeeker._id}`,
        "raw"
      );
      payload.resume = {
        url: up.secure_url,
        filename: file.originalname,
        uploadedAt: new Date(),
        publicId: up.public_id,
        bytes: up.bytes,
      };
    }

    if (
      req.files &&
      req.files.coverLetterFile &&
      req.files.coverLetterFile[0]
    ) {
      const file = req.files.coverLetterFile[0];
      const up = await uploadToCloudinary(
        file.buffer,
        `lifemate/applications/${jobSeeker._id}`,
        "raw"
      );
      payload.coverLetter = Object.assign({}, payload.coverLetter, {
        fileUrl: up.secure_url,
        filename: file.originalname,
        publicId: up.public_id,
        bytes: up.bytes,
      });
    }

    const application = await Application.create(payload);
    // increment application count on job
    job.incApplications().catch(() => {});

    return successResponse(res, 201, "Application submitted", { application });
  } catch (err) {
    console.error("Apply error:", err);
    if (err.code === 11000) {
      return errorResponse(res, 400, "You have already applied to this job");
    }
    if (err.name === "ValidationError") {
      const errors = Object.values(err.errors).map((e) => ({
        field: e.path,
        message: e.message,
      }));
      return validationErrorResponse(res, errors);
    }
    return errorResponse(res, 500, "Failed to submit application");
  }
};

// PATCH /applications/:id/rating (employer/admin)
exports.setRating = async (req, res) => {
  try {
    const { rating } = req.body;
    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
      return validationErrorResponse(res, [{ field: 'rating', message: 'Rating must be between 1 and 5' }]);
    }

    const application = await Application.findById(req.params.id);
    if (!application) return notFoundResponse(res, 'Application not found');

    if (req.user.role !== 'admin') {
      const employer = await Employer.findOne({ user: req.user._id });
      if (!employer || application.employer.toString() !== employer._id.toString()) {
        return forbiddenResponse(res, 'Not authorized to rate this application');
      }
    }

    application.rating = rating;
    await application.save();
    return successResponse(res, 200, 'Rating updated', { application });
  } catch (err) {
    console.error('Set rating error:', err);
    return errorResponse(res, 500, 'Failed to update rating');
  }
};

// GET /applications/me (jobseeker)
exports.listMyApplications = async (req, res) => {
  try {
    const jobSeeker = await JobSeeker.findOne({ user: req.user._id });
    if (!jobSeeker)
      return errorResponse(res, 403, "Job seeker profile not found");

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 10);
    const skip = (page - 1) * limit;

    const filters = buildFilters({ ...req.query, jobSeeker: jobSeeker._id });
    const sort = req.query.sort || "-appliedAt";

    const [items, total] = await Promise.all([
      Application.find(filters)
        .populate("job")
        .sort(sort)
        .skip(skip)
        .limit(limit),
      Application.countDocuments(filters),
    ]);

    return successResponse(res, 200, "Applications fetched", {
      items,
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("List my applications error:", err);
    return errorResponse(res, 500, "Failed to fetch applications");
  }
};

// GET /applications/employer (employer)
exports.listEmployerApplications = async (req, res) => {
  try {
    const employer = await Employer.findOne({ user: req.user._id });
    if (!employer) return errorResponse(res, 403, "Employer profile not found");

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 10);
    const skip = (page - 1) * limit;

    const filters = buildFilters({ ...req.query, employer: employer._id });
    const sort = req.query.sort || "-appliedAt";

    const [items, total] = await Promise.all([
      Application.find(filters)
        .populate({ path: "job" })
        .populate({
          path: "jobSeeker",
          populate: { path: "user", select: "firstName lastName email phone" },
        })
        .sort(sort)
        .skip(skip)
        .limit(limit),
      Application.countDocuments(filters),
    ]);

    return successResponse(res, 200, "Employer applications fetched", {
      items,
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("List employer applications error:", err);
    return errorResponse(res, 500, "Failed to fetch applications");
  }
};
exports.getById = async (req, res) => {
  try {
    const application = await Application.findById(req.params.id)
      .populate('job')
      .populate({
        path: 'jobSeeker',
        populate: { path: 'user', select: 'firstName lastName email phone profileImage role' }
      })
      .populate('employer');

    if (!application) return notFoundResponse(res, "Application not found");

    const isAdmin = req.user.role === "admin";

    if (!isAdmin) {
      const jobSeeker = await JobSeeker.findOne({ user: req.user._id });
      const employer = await Employer.findOne({ user: req.user._id });
      const ownsAsSeeker =
        jobSeeker &&
        application.jobSeeker.toString() === jobSeeker._id.toString();
      const ownsAsEmployer =
        employer && application.employer.toString() === employer._id.toString();
      if (!ownsAsSeeker && !ownsAsEmployer) {
        return forbiddenResponse(
          res,
          "Not authorized to view this application"
        );
      }

      // Mark viewed by employer when appropriate (non-blocking)
      if (ownsAsEmployer && !application.isViewedByEmployer) {
        application.isViewedByEmployer = true;
        application.save().catch(() => {});
      }
    }

    return successResponse(res, 200, "Application fetched", { application });
  } catch (err) {
    console.error("Get application error:", err);
    return errorResponse(res, 500, "Failed to fetch application");
  }
};

// PATCH /applications/:id/status (employer/admin)
exports.updateStatus = async (req, res) => {
  try {
    const application = await Application.findById(req.params.id);
    if (!application) return notFoundResponse(res, "Application not found");

    if (req.user.role !== "admin") {
      const employer = await Employer.findOne({ user: req.user._id });
      if (
        !employer ||
        application.employer.toString() !== employer._id.toString()
      ) {
        return forbiddenResponse(
          res,
          "Not authorized to update this application"
        );
      }
    }

    const { status, note } = req.body;
    application.status = status;
    application.updatedAtManual = new Date();
    application.history.push({
      status,
      note,
      by: req.user._id,
      at: new Date(),
    });
    await application.save();

    return successResponse(res, 200, "Application status updated", {
      application,
    });
  } catch (err) {
    console.error("Update application status error:", err);
    return errorResponse(res, 500, "Failed to update application status");
  }
};

// GET /applications/job/:jobId (employer)
exports.listApplicationsForJob = async (req, res) => {
  try {
    const { jobId } = req.params;

    // Ensure requester is the owner of the job
    const employer = await Employer.findOne({ user: req.user._id });
    if (!employer) return errorResponse(res, 403, "Employer profile not found");

    const job = await Job.findOne({ _id: jobId, employer: employer._id });
    if (!job)
      return forbiddenResponse(
        res,
        "Not authorized to view applications for this job"
      );

    const applications = await Application.find({ job: jobId })
      .populate({ path: "job" })
      .populate({
        path: "jobSeeker",
        populate: { path: "user", select: "firstName lastName email phone" },
      })
      .sort("-appliedAt");

    return successResponse(res, 200, "Applications fetched", { applications });
  } catch (err) {
    console.error("List applications for job error:", err);
    return errorResponse(res, 500, "Failed to fetch applications");
  }
};
