const mongoose = require('mongoose');

/**
 * Application Schema - Job applications submitted by job seekers
 */
const applicationSchema = new mongoose.Schema({
  job: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true,
    index: true,
  },
  jobSeeker: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'JobSeeker',
    required: true,
    index: true,
  },
  employer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employer',
    required: true,
    index: true,
  },

  // timeline and status tracking
  status: {
    type: String,
    enum: ['Applied', 'Under Review', 'Interview', 'Offered', 'Rejected', 'Withdrawn'],
    default: 'Applied',
    index: true,
  },
  appliedAt: { type: Date, default: Date.now, index: true },
  updatedAtManual: { type: Date },

  // attachments / snapshots
  resume: {
    url: String,
    filename: String,
    uploadedAt: Date,
    publicId: String,
    bytes: Number,
  },
  coverLetter: {
    text: { type: String, trim: true, maxlength: 5000 },
    fileUrl: String,
    filename: String,
    publicId: String,
    bytes: Number,
  },
  answers: [{
    questionId: String,
    question: String,
    answer: String,
  }],

  // audit trail
  history: [{
    status: {
      type: String,
      enum: ['Applied', 'Under Review', 'Interview', 'Offered', 'Rejected', 'Withdrawn'],
    },
    note: { type: String, trim: true, maxlength: 1000 },
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    at: { type: Date, default: Date.now },
  }],

  // visibility and meta
  isViewedByEmployer: { type: Boolean, default: false },
  isViewedByJobSeeker: { type: Boolean, default: true },
  rating: { type: Number, min: 1, max: 5 }, // optional employer rating for candidate
}, {
  timestamps: true,
});

// Prevent duplicate applications to the same job by the same job seeker
applicationSchema.index({ job: 1, jobSeeker: 1 }, { unique: true });

module.exports = mongoose.model('Application', applicationSchema);
