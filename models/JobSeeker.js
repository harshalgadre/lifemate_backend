const mongoose = require('mongoose');

/**
 * JobSeeker Schema - Extended user model for job seekers
 * Contains healthcare-specific job seeker information and preferences
 */
const jobSeekerSchema = new mongoose.Schema({
  // Reference to base User model
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  
  // Professional Information
  title: {
    type: String,
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters'],
  },
  bio: {
    type: String,
    trim: true,
    maxlength: [1000, 'Bio cannot exceed 1000 characters'],
  },
  
  // Healthcare Specialization
  specializations: [{
    type: String,
    trim: true,
    enum: [
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
      'Other'
    ],
  }],
  
  // Experience Information
  experience: {
    totalYears: {
      type: Number,
      min: [0, 'Experience cannot be negative'],
      max: [50, 'Experience cannot exceed 50 years'],
    },
    currentPosition: {
      type: String,
      trim: true,
      maxlength: [100, 'Current position cannot exceed 100 characters'],
    },
    currentCompany: {
      type: String,
      trim: true,
      maxlength: [100, 'Current company cannot exceed 100 characters'],
    },
    isCurrentlyEmployed: {
      type: Boolean,
      default: true,
    },
  },
  
  // Education
  education: [{
    degree: {
      type: String,
      required: true,
      trim: true,
      enum: ['MBBS', 'MD', 'MS', 'BDS', 'MDS', 'BPT', 'MPT', 'BSc Nursing', 'MSc Nursing', 'BPharm', 'MPharm', 'BSc', 'MSc', 'PhD', 'Diploma', 'Certificate', 'Other'],
    },
    field: {
      type: String,
      required: true,
      trim: true,
      maxlength: [100, 'Field cannot exceed 100 characters'],
    },
    institution: {
      type: String,
      required: true,
      trim: true,
      maxlength: [200, 'Institution name cannot exceed 200 characters'],
    },
    yearOfCompletion: {
      type: Number,
      required: true,
      min: [1950, 'Year cannot be before 1950'],
      max: [new Date().getFullYear() + 5, 'Year cannot be more than 5 years in future'],
    },
    grade: {
      type: String,
      trim: true,
      maxlength: [20, 'Grade cannot exceed 20 characters'],
    },
  }],
  
  // Work Experience Details
  workExperience: [{
    position: {
      type: String,
      required: true,
      trim: true,
      maxlength: [100, 'Position cannot exceed 100 characters'],
    },
    company: {
      type: String,
      required: true,
      trim: true,
      maxlength: [100, 'Company name cannot exceed 100 characters'],
    },
    location: {
      type: String,
      required: true,
      trim: true,
      maxlength: [100, 'Location cannot exceed 100 characters'],
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      validate: {
        validator: function(value) {
          return !value || value >= this.startDate;
        },
        message: 'End date must be after start date',
      },
    },
    isCurrent: {
      type: Boolean,
      default: false,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    achievements: [{
      type: String,
      trim: true,
      maxlength: [200, 'Achievement cannot exceed 200 characters'],
    }],
  }],
  
  // Skills and Certifications
  skills: [{
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: [50, 'Skill name cannot exceed 50 characters'],
    },
    level: {
      type: String,
      enum: ['Beginner', 'Intermediate', 'Advanced', 'Expert'],
      default: 'Intermediate',
    },
  }],
  
  certifications: [{
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: [100, 'Certification name cannot exceed 100 characters'],
    },
    issuingOrganization: {
      type: String,
      required: true,
      trim: true,
      maxlength: [100, 'Organization name cannot exceed 100 characters'],
    },
    issueDate: {
      type: Date,
      required: true,
    },
    expiryDate: {
      type: Date,
      validate: {
        validator: function(value) {
          return !value || value >= this.issueDate;
        },
        message: 'Expiry date must be after issue date',
      },
    },
    credentialId: {
      type: String,
      trim: true,
      maxlength: [50, 'Credential ID cannot exceed 50 characters'],
    },
    credentialUrl: {
      type: String,
      trim: true,
    },
  }],
  
  // Job Preferences
  jobPreferences: {
    preferredLocations: [{
      city: {
        type: String,
        required: true,
        trim: true,
        maxlength: [50, 'City name cannot exceed 50 characters'],
      },
      state: {
        type: String,
        required: true,
        trim: true,
        maxlength: [50, 'State name cannot exceed 50 characters'],
      },
      country: {
        type: String,
        required: true,
        trim: true,
        maxlength: [50, 'Country name cannot exceed 50 characters'],
        default: 'India',
      },
    }],
    preferredJobTypes: [{
      type: String,
      enum: ['Full-time', 'Part-time', 'Contract', 'Freelance', 'Internship', 'Volunteer'],
    }],
    preferredShifts: [{
      type: String,
      enum: ['Day', 'Night', 'Rotating', 'Flexible'],
    }],
    expectedSalary: {
      min: {
        type: Number,
        min: [0, 'Minimum salary cannot be negative'],
      },
      max: {
        type: Number,
        min: [0, 'Maximum salary cannot be negative'],
      },
      currency: {
        type: String,
        default: 'INR',
        enum: ['INR', 'USD', 'EUR', 'GBP'],
      },
      period: {
        type: String,
        default: 'Annual',
        enum: ['Hourly', 'Daily', 'Monthly', 'Annual'],
      },
    },
    availability: {
      type: String,
      enum: ['Immediately', '2 weeks', '1 month', '2 months', '3 months', 'Negotiable'],
      default: 'Negotiable',
    },
    willingToRelocate: {
      type: Boolean,
      default: false,
    },
    remoteWorkPreference: {
      type: String,
      enum: ['On-site only', 'Remote only', 'Hybrid', 'No preference'],
      default: 'No preference',
    },
  },
  
  // Documents
  resume: {
    url: String,
    filename: String,
    uploadedAt: Date,
    publicId: String,
    bytes: Number,
  },
  coverLetter: {
    url: String,
    filename: String,
    uploadedAt: Date,
    publicId: String,
    bytes: Number,
  },
  portfolio: [{
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: [100, 'Portfolio title cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Portfolio description cannot exceed 500 characters'],
    },
    url: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['Document', 'Image', 'Video', 'Link'],
      default: 'Link',
    },
  }],
  
  // Profile Completion
  profileCompletion: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  
  // Privacy Settings
  privacySettings: {
    showContactInfo: {
      type: Boolean,
      default: true,
    },
    showCurrentSalary: {
      type: Boolean,
      default: false,
    },
    showProfileToEmployers: {
      type: Boolean,
      default: true,
    },
    allowDirectMessages: {
      type: Boolean,
      default: true,
    },
  },
  
  // Statistics
  stats: {
    profileViews: {
      type: Number,
      default: 0,
    },
    applicationsSubmitted: {
      type: Number,
      default: 0,
    },
    interviewsScheduled: {
      type: Number,
      default: 0,
    },
    jobsOffered: {
      type: Number,
      default: 0,
    },
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Virtual for full name (from User model)
jobSeekerSchema.virtual('fullName').get(function() {
  return this.user ? `${this.user.firstName} ${this.user.lastName}` : '';
});

// Index for better query performance
jobSeekerSchema.index({ user: 1 });
jobSeekerSchema.index({ 'specializations': 1 });
jobSeekerSchema.index({ 'experience.totalYears': 1 });
jobSeekerSchema.index({ 'jobPreferences.preferredLocations.city': 1 });
jobSeekerSchema.index({ 'jobPreferences.preferredLocations.state': 1 });
jobSeekerSchema.index({ 'profileCompletion': 1 });

/**
 * Calculate profile completion percentage
 */
jobSeekerSchema.methods.calculateProfileCompletion = function() {
  let completion = 0;
  const totalFields = 10;
  
  if (this.title) completion += 10;
  if (this.bio) completion += 10;
  if (this.specializations && this.specializations.length > 0) completion += 10;
  if (this.experience.totalYears !== undefined) completion += 10;
  if (this.education && this.education.length > 0) completion += 10;
  if (this.workExperience && this.workExperience.length > 0) completion += 10;
  if (this.skills && this.skills.length > 0) completion += 10;
  if (this.jobPreferences.preferredLocations && this.jobPreferences.preferredLocations.length > 0) completion += 10;
  if (this.resume && this.resume.url) completion += 10;
  if (this.user && this.user.profileImage) completion += 10;
  
  this.profileCompletion = completion;
  return completion;
};

/**
 * Update profile completion before saving
 */
jobSeekerSchema.pre('save', function(next) {
  this.calculateProfileCompletion();
  next();
});

module.exports = mongoose.model('JobSeeker', jobSeekerSchema);
