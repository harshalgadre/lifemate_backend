const mongoose = require('mongoose');

/**
 * Job Schema - Represents a job post created by an employer
 * Supports filters and columns shown on the Job & Content Management page
 */
const SPECIALIZATIONS = [
  'General Medicine',
  'Cardiology',
  'Neurology',
  'Orthopedics',
  'Pediatrics',
  'Gynecology',
  'Dermatology',
  'Psychiatry',
  'Radiology',
  'Anesthesiology',
  'Emergency Medicine',
  'Internal Medicine',
  'Surgery',
  'Oncology',
  'Pathology',
  'Ophthalmology',
  'ENT',
  'Urology',
  'Gastroenterology',
  'Pulmonology',
  'Endocrinology',
  'Rheumatology',
  'Nephrology',
  'Hematology',
  'Infectious Disease',
  'Physical Therapy',
  'Occupational Therapy',
  'Speech Therapy',
  'Nursing',
  'Pharmacy',
  'Medical Technology',
  'Other',
];

const jobSchema = new mongoose.Schema({
  // Owner
  employer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employer',
    required: true,
    index: true,
  },

  // Display columns
  title: {
    type: String,
    required: [true, 'Job title is required'],
    trim: true,
    maxlength: [150, 'Job title cannot exceed 150 characters'],
    index: true,
  },
  organizationName: {
    type: String, // stored snapshot from Employer for faster listing
    trim: true,
    maxlength: [200, 'Organization name cannot exceed 200 characters'],
  },
  location: {
    city: { type: String, required: true, trim: true, maxlength: 50 },
    state: { type: String, required: true, trim: true, maxlength: 50 },
    country: { type: String, default: 'India', trim: true, maxlength: 50 },
  },
  specialization: {
    type: String,
    enum: SPECIALIZATIONS,
    required: [true, 'Specialization is required'],
    index: true,
  },
  experienceRequired: {
    minYears: { type: Number, min: 0, default: 0 },
    maxYears: { type: Number, min: 0, max: 50 },
  },

  // Filters
  jobType: {
    type: String,
    enum: ['Full-time', 'Part-time', 'Contract', 'Freelance', 'Internship', 'Volunteer'],
    default: 'Full-time',
    index: true,
  },
  shift: {
    type: String,
    enum: ['Day', 'Night', 'Rotating', 'Flexible'],
    default: 'Day',
  },
  salary: {
    min: { type: Number, min: 0 },
    max: { type: Number, min: 0 },
    currency: { type: String, enum: ['INR', 'USD', 'EUR', 'GBP'], default: 'INR' },
    period: { type: String, enum: ['Hourly', 'Daily', 'Monthly', 'Annual'], default: 'Annual' },
  },

  // Content
  description: { type: String, trim: true, maxlength: 5000 },
  responsibilities: [{ type: String, trim: true, maxlength: 500 }],
  requirements: [{ type: String, trim: true, maxlength: 500 }],
  benefits: [{ type: String, trim: true, maxlength: 300 }],

  // Lifecycle and moderation
  status: {
    type: String,
    enum: ['Active', 'Pending', 'Flagged', 'Archived', 'Closed'],
    default: 'Pending',
    index: true,
  },
  postedAt: { type: Date, default: Date.now, index: true },
  expiresAt: { type: Date },

  // Metrics
  stats: {
    views: { type: Number, default: 0 },
    applications: { type: Number, default: 0 },
  },

  // Visibility
  isFeatured: { type: Boolean, default: false },
  isRemote: { type: Boolean, default: false },
}, {
  timestamps: true,
});

// Text index for search
jobSchema.index({ title: 'text', description: 'text', organizationName: 'text' });
jobSchema.index({ 'location.city': 1, 'location.state': 1, 'location.country': 1 });

// Helpers
jobSchema.methods.isOpen = function () {
  if (this.status !== 'Active') return false;
  if (this.expiresAt && this.expiresAt < new Date()) return false;
  return true;
};

jobSchema.methods.incViews = function (by = 1) {
  this.stats.views += by;
  return this.save();
};

jobSchema.methods.incApplications = function (by = 1) {
  this.stats.applications += by;
  return this.save();
};

module.exports = mongoose.model('Job', jobSchema);
