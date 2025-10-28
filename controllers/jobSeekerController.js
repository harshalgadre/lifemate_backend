const JobSeeker = require('../models/JobSeeker');
const { uploadToCloudinary, deleteFromCloudinary } = require('../config/cloudinary');
const { successResponse, errorResponse, notFoundResponse, validationErrorResponse } = require('../utils/response');

// helper to find JS profile
async function getJobSeekerByUser(userId) {
  const js = await JobSeeker.findOne({ user: userId });
  return js;
}

// GET /api/jobseeker/profile
exports.getMyProfile = async (req, res) => {
  try {
    const js = await JobSeeker.findOne({ user: req.user._id })
      .populate({ path: 'user', select: 'firstName lastName email phone profileImage role' });
    if (!js) return notFoundResponse(res, 'Job seeker profile not found');
    return successResponse(res, 200, 'Job seeker profile fetched', { jobSeeker: js });
  } catch (err) {
    console.error('Get jobseeker profile error:', err);
    return errorResponse(res, 500, 'Failed to fetch job seeker profile');
  }
};

// PUT /api/jobseeker/profile
exports.updateMyProfile = async (req, res) => {
  try {
    const js = await JobSeeker.findOne({ user: req.user._id });
    if (!js) return notFoundResponse(res, 'Job seeker profile not found');

    const allowed = ['title','bio','specializations','experience','education','workExperience','skills','certifications','jobPreferences','privacySettings'];
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        let value = req.body[key];
        // If complex field is sent as string, try to parse JSON
        if (
          typeof value === 'string' &&
          ['specializations','experience','education','workExperience','skills','certifications','jobPreferences','privacySettings'].includes(key)
        ) {
          try {
            value = JSON.parse(value);
          } catch {
            // Special handling: experience sent as a number string => map to { totalYears }
            if (key === 'experience') {
              const n = Number(value);
              if (!Number.isNaN(n)) {
                value = { totalYears: n };
              }
            }
          }
        }
        // If experience is a number, wrap it
        if (key === 'experience' && typeof value === 'number') {
          value = { totalYears: value };
        }
        js.set(key, value);
      }
    }

    await js.save();
    return successResponse(res, 200, 'Job seeker profile updated', { jobSeeker: js });
  } catch (err) {
    console.error('Update jobseeker profile error:', err);
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(e => ({ field: e.path, message: e.message }));
      return validationErrorResponse(res, errors);
    }
    return errorResponse(res, 500, 'Failed to update job seeker profile');
  }
};

// POST /api/jobseeker/resume
exports.uploadResume = async (req, res) => {
  try {
    const js = await getJobSeekerByUser(req.user._id);
    if (!js) return notFoundResponse(res, 'Job seeker profile not found');

    if (!req.file) return errorResponse(res, 400, 'No resume file uploaded');

    // delete previous
    if (js.resume && js.resume.publicId) {
      try { await deleteFromCloudinary(js.resume.publicId); } catch (e) {}
    }

    const up = await uploadToCloudinary(req.file.buffer, `lifemate/jobseekers/${js._id}`, 'raw');
    js.resume = {
      url: up.secure_url,
      filename: req.file.originalname,
      uploadedAt: new Date(),
      publicId: up.public_id,
      bytes: up.bytes,
    };
    await js.save();

    return successResponse(res, 200, 'Resume uploaded', { resume: js.resume });
  } catch (err) {
    console.error('Upload resume error:', err);
    return errorResponse(res, 500, 'Failed to upload resume');
  }
};

// DELETE /api/jobseeker/resume
exports.deleteResume = async (req, res) => {
  try {
    const js = await getJobSeekerByUser(req.user._id);
    if (!js) return notFoundResponse(res, 'Job seeker profile not found');

    if (js.resume && js.resume.publicId) {
      try { await deleteFromCloudinary(js.resume.publicId); } catch (e) {}
    }
    js.resume = undefined;
    await js.save();

    return successResponse(res, 200, 'Resume deleted');
  } catch (err) {
    console.error('Delete resume error:', err);
    return errorResponse(res, 500, 'Failed to delete resume');
  }
};

// POST /api/jobseeker/cover-letter
exports.uploadCoverLetter = async (req, res) => {
  try {
    const js = await getJobSeekerByUser(req.user._id);
    if (!js) return notFoundResponse(res, 'Job seeker profile not found');

    if (!req.file) return errorResponse(res, 400, 'No cover letter file uploaded');

    if (js.coverLetter && js.coverLetter.publicId) {
      try { await deleteFromCloudinary(js.coverLetter.publicId); } catch (e) {}
    }

    const up = await uploadToCloudinary(req.file.buffer, `lifemate/jobseekers/${js._id}`, 'raw');
    js.coverLetter = {
      url: up.secure_url,
      filename: req.file.originalname,
      uploadedAt: new Date(),
      publicId: up.public_id,
      bytes: up.bytes,
    };
    await js.save();

    return successResponse(res, 200, 'Cover letter uploaded', { coverLetter: js.coverLetter });
  } catch (err) {
    console.error('Upload cover letter error:', err);
    return errorResponse(res, 500, 'Failed to upload cover letter');
  }
};

// DELETE /api/jobseeker/cover-letter
exports.deleteCoverLetter = async (req, res) => {
  try {
    const js = await getJobSeekerByUser(req.user._id);
    if (!js) return notFoundResponse(res, 'Job seeker profile not found');

    if (js.coverLetter && js.coverLetter.publicId) {
      try { await deleteFromCloudinary(js.coverLetter.publicId); } catch (e) {}
    }
    js.coverLetter = undefined;
    await js.save();

    return successResponse(res, 200, 'Cover letter deleted');
  } catch (err) {
    console.error('Delete cover letter error:', err);
    return errorResponse(res, 500, 'Failed to delete cover letter');
  }
};
