const SavedJob = require('../models/SavedJob');
const Job = require('../models/Job');
const JobSeeker = require('../models/JobSeeker');
const { successResponse, errorResponse, notFoundResponse } = require('../utils/response');

// POST /jobs/:id/save (jobseeker)
exports.save = async (req, res) => {
  try {
    const jobSeeker = await JobSeeker.findOne({ user: req.user._id });
    if (!jobSeeker) return errorResponse(res, 403, 'Job seeker profile not found');

    const job = await Job.findById(req.params.id);
    if (!job) return notFoundResponse(res, 'Job not found');

    const saved = await SavedJob.findOneAndUpdate(
      { jobSeeker: jobSeeker._id, job: job._id },
      { $setOnInsert: { jobSeeker: jobSeeker._id, job: job._id, notes: req.body.notes } },
      { upsert: true, new: true }
    );

    return successResponse(res, 201, 'Job saved', { saved });
  } catch (err) {
    console.error('Save job error:', err);
    return errorResponse(res, 500, 'Failed to save job');
  }
};

// DELETE /jobs/:id/save (jobseeker)
exports.unsave = async (req, res) => {
  try {
    const jobSeeker = await JobSeeker.findOne({ user: req.user._id });
    if (!jobSeeker) return errorResponse(res, 403, 'Job seeker profile not found');

    const job = await Job.findById(req.params.id);
    if (!job) return notFoundResponse(res, 'Job not found');

    await SavedJob.deleteOne({ jobSeeker: jobSeeker._id, job: job._id });
    return successResponse(res, 200, 'Job unsaved');
  } catch (err) {
    console.error('Unsave job error:', err);
    return errorResponse(res, 500, 'Failed to unsave job');
  }
};

// GET /saved-jobs (jobseeker)
exports.list = async (req, res) => {
  try {
    const jobSeeker = await JobSeeker.findOne({ user: req.user._id });
    if (!jobSeeker) return errorResponse(res, 403, 'Job seeker profile not found');

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 10);
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      SavedJob.find({ jobSeeker: jobSeeker._id }).populate('job').sort('-createdAt').skip(skip).limit(limit),
      SavedJob.countDocuments({ jobSeeker: jobSeeker._id }),
    ]);

    return successResponse(res, 200, 'Saved jobs fetched', { items, page, limit, total, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error('List saved jobs error:', err);
    return errorResponse(res, 500, 'Failed to fetch saved jobs');
  }
};
