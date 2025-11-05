const mongoose = require('mongoose');

/**
 * Resume Schema - Complete Resume Management System
 * Simplified schema with essential fields only
 */
const resumeSchema = new mongoose.Schema({
  // Reference to User (not JobSeeker)
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },

  // Resume title
  title: {
    type: String,
    required: [true, 'Resume title is required'],
    trim: true,
    maxlength: [100, 'Resume title cannot exceed 100 characters'],
  },

  // Personal Information
  personalInfo: {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    linkedIn: {
      type: String,
      trim: true,
    },
    github: {
      type: String,
      trim: true,
    },
    website: {
      type: String,
      trim: true,
    },
    address: {
      street: String,
      city: String,
      state: String,
      country: String,
      zipCode: String,
    },
  },

  // Professional Summary
  summary: {
    type: String,
    trim: true,
    maxlength: [1000, 'Summary cannot exceed 1000 characters'],
  },

  // Education
  education: [{
    degree: {
      type: String,
      required: true,
      trim: true,
    },
    field: {
      type: String,
      required: true,
      trim: true,
    },
    institution: {
      type: String,
      required: true,
      trim: true,
    },
    yearOfCompletion: {
      type: Number,
      required: true,
    },
    grade: {
      type: String,
      trim: true,
    },
    isVisible: {
      type: Boolean,
      default: true,
    },
  }],

  // Work Experience
  workExperience: [{
    position: {
      type: String,
      required: true,
      trim: true,
    },
    company: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      type: String,
      trim: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
    },
    isCurrent: {
      type: Boolean,
      default: false,
    },
    description: {
      type: String,
      trim: true,
    },
    achievements: [{
      type: String,
      trim: true,
    }],
    isVisible: {
      type: Boolean,
      default: true,
    },
  }],

  // Skills
  skills: [{
    name: {
      type: String,
      required: true,
      trim: true,
    },
    proficiency: {
      type: String,
      enum: ['Beginner', 'Intermediate', 'Advanced', 'Expert'],
    },
    isVisible: {
      type: Boolean,
      default: true,
    },
  }],

  // Certifications
  certifications: [{
    name: {
      type: String,
      required: true,
      trim: true,
    },
    issuingOrganization: {
      type: String,
      required: true,
      trim: true,
    },
    issueDate: {
      type: Date,
      required: true,
    },
    expiryDate: {
      type: Date,
    },
    credentialId: {
      type: String,
      trim: true,
    },
    isVisible: {
      type: Boolean,
      default: true,
    },
  }],

  // Projects
  projects: [{
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Project description cannot exceed 500 characters'],
    },
    technologies: [{
      type: String,
      trim: true,
    }],
    url: {
      type: String,
      trim: true,
    },
    isVisible: {
      type: Boolean,
      default: true,
    },
  }],

  // Languages
  languages: [{
    name: {
      type: String,
      required: true,
      trim: true,
    },
    proficiency: {
      type: String,
      enum: ['Basic', 'Intermediate', 'Fluent', 'Native'],
      default: 'Intermediate',
    },
    isVisible: {
      type: Boolean,
      default: true,
    },
  }],

  // Custom Sections (for flexibility)
  customSections: [{
    title: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      trim: true,
    },
    items: [{
      type: String,
      trim: true,
    }],
    isVisible: {
      type: Boolean,
      default: true,
    },
  }],

  // Styling Options
  styling: {
    fontFamily: {
      type: String,
      enum: ['Arial', 'Times New Roman', 'Calibri', 'Georgia', 'Helvetica'],
      default: 'Arial',
    },
    fontSize: {
      type: Number,
      min: 10,
      max: 14,
      default: 11,
    },
    primaryColor: {
      type: String,
      default: '#000000',
    },
    accentColor: {
      type: String,
      default: '#2563eb',
    },
    spacing: {
      type: String,
      enum: ['compact', 'normal', 'relaxed'],
      default: 'normal',
    },
  },

  // PDF URL and Public ID
  pdfUrl: {
    type: String,
    trim: true,
  },
  pdfPublicId: {
    type: String,
    trim: true,
  },

  // Default resume flag
  isDefault: {
    type: Boolean,
    default: false,
  },

  // Statistics
  stats: {
    views: {
      type: Number,
      default: 0,
    },
    downloads: {
      type: Number,
      default: 0,
    },
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes
resumeSchema.index({ userId: 1, isDefault: 1 });
resumeSchema.index({ userId: 1, createdAt: -1 });

// Ensure only one default resume per user
resumeSchema.pre('save', async function(next) {
  if (this.isDefault && this.isModified('isDefault')) {
    await this.constructor.updateMany(
      { userId: this.userId, _id: { $ne: this._id } },
      { $set: { isDefault: false } }
    );
  }
  next();
});

module.exports = mongoose.model('Resume', resumeSchema);
