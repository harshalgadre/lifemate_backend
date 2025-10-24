const mongoose = require('mongoose');

/**
 * SavedJob Schema - Bookmarks for job seekers
 */
savedJobSchema = new mongoose.Schema({
  jobSeeker: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'JobSeeker',
    required: true,
    index: true,
  },
  job: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true,
    index: true,
  },
  notes: { type: String, trim: true, maxlength: 1000 },
  createdAt: { type: Date, default: Date.now },
}, {
  timestamps: true,
});

// Prevent duplicate bookmarks for same job by same job seeker
savedJobSchema.index({ jobSeeker: 1, job: 1 }, { unique: true });

module.exports = mongoose.model('SavedJob', savedJobSchema);
