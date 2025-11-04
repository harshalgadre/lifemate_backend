const Resume = require('../models/Resume');
const JobSeeker = require('../models/JobSeeker');
const { generateAndUploadResumePDF } = require('../services/pdfService');
const { deleteFromCloudinary } = require('../config/cloudinary');
const { successResponse, errorResponse, notFoundResponse, validationErrorResponse } = require('../utils/response');

/**
 * GET /api/resume/templates
 * Get available resume templates
 */
exports.getTemplates = async (req, res) => {
  try {
    const templates = [
      {
        id: 'classic',
        name: 'Classic',
        description: 'Traditional resume format with clean layout',
        preview: '/templates/classic-preview.png',
      },
      {
        id: 'modern',
        name: 'Modern',
        description: 'Contemporary design with accent colors',
        preview: '/templates/modern-preview.png',
      },
      {
        id: 'professional',
        name: 'Professional',
        description: 'Corporate-friendly format',
        preview: '/templates/professional-preview.png',
      },
      {
        id: 'creative',
        name: 'Creative',
        description: 'Eye-catching design for creative roles',
        preview: '/templates/creative-preview.png',
      },
      {
        id: 'minimal',
        name: 'Minimal',
        description: 'Simple and elegant layout',
        preview: '/templates/minimal-preview.png',
      },
    ];

    return successResponse(res, 200, 'Templates fetched successfully', { templates });
  } catch (err) {
    console.error('Get templates error:', err);
    return errorResponse(res, 500, 'Failed to fetch templates');
  }
};

/**
 * POST /api/resume/build
 * Create a new resume from profile data or custom data
 */
exports.createResume = async (req, res) => {
  try {
    const jobSeeker = await JobSeeker.findOne({ user: req.user._id })
      .populate('user', 'firstName lastName email phone');
    
    if (!jobSeeker) {
      return notFoundResponse(res, 'Job seeker profile not found');
    }

    const {
      title,
      templateId,
      personalInfo,
      summary,
      education,
      workExperience,
      skills,
      certifications,
      projects,
      languages,
      customSections,
      sectionOrder,
      styling,
      autoPopulate = true,
    } = req.body;

    // Create resume data
    const resumeData = {
      jobSeeker: jobSeeker._id,
      title: title || 'My Resume',
      templateId: templateId || 'modern',
    };

    // Auto-populate from profile or use provided data
    if (autoPopulate) {
      // Personal Info from User model
      resumeData.personalInfo = {
        fullName: `${jobSeeker.user.firstName} ${jobSeeker.user.lastName}`,
        email: jobSeeker.user.email,
        phone: jobSeeker.user.phone,
        ...personalInfo,
      };

      resumeData.summary = summary || jobSeeker.bio || '';
      resumeData.education = education || jobSeeker.education || [];
      resumeData.workExperience = workExperience || jobSeeker.workExperience || [];
      resumeData.skills = skills || jobSeeker.skills || [];
      resumeData.certifications = certifications || jobSeeker.certifications || [];
      resumeData.projects = projects || jobSeeker.projects || [];
      resumeData.languages = languages || jobSeeker.languages || [];
    } else {
      // Use only provided data
      resumeData.personalInfo = personalInfo;
      resumeData.summary = summary;
      resumeData.education = education || [];
      resumeData.workExperience = workExperience || [];
      resumeData.skills = skills || [];
      resumeData.certifications = certifications || [];
      resumeData.projects = projects || [];
      resumeData.languages = languages || [];
    }

    resumeData.customSections = customSections || [];
    resumeData.sectionOrder = sectionOrder || ['summary', 'workExperience', 'education', 'skills', 'projects', 'certifications', 'languages'];
    resumeData.styling = styling || {};

    // Create resume
    const resume = new Resume(resumeData);
    await resume.save();

    // Generate PDF
    try {
      const pdfData = await generateAndUploadResumePDF(resume, jobSeeker._id);
      resume.generatedPdf = pdfData;
      await resume.save();
    } catch (pdfError) {
      console.error('PDF generation failed:', pdfError);
      // Continue without PDF - can be generated later
    }

    // Add to jobSeeker's builtResumes
    jobSeeker.builtResumes.push(resume._id);
    await jobSeeker.save();

    return successResponse(res, 201, 'Resume created successfully', { resume });
  } catch (err) {
    console.error('Create resume error:', err);
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(e => ({ field: e.path, message: e.message }));
      return validationErrorResponse(res, errors);
    }
    return errorResponse(res, 500, 'Failed to create resume');
  }
};

/**
 * GET /api/resume/list
 * Get all resumes for the logged-in job seeker
 */
exports.getMyResumes = async (req, res) => {
  try {
    const jobSeeker = await JobSeeker.findOne({ user: req.user._id });
    if (!jobSeeker) {
      return notFoundResponse(res, 'Job seeker profile not found');
    }

    const resumes = await Resume.find({ jobSeeker: jobSeeker._id })
      .sort({ isDefault: -1, updatedAt: -1 })
      .select('-__v');

    return successResponse(res, 200, 'Resumes fetched successfully', { 
      resumes,
      count: resumes.length,
    });
  } catch (err) {
    console.error('Get resumes error:', err);
    return errorResponse(res, 500, 'Failed to fetch resumes');
  }
};

/**
 * GET /api/resume/:id
 * Get a specific resume by ID
 */
exports.getResume = async (req, res) => {
  try {
    const jobSeeker = await JobSeeker.findOne({ user: req.user._id });
    if (!jobSeeker) {
      return notFoundResponse(res, 'Job seeker profile not found');
    }

    const resume = await Resume.findOne({
      _id: req.params.id,
      jobSeeker: jobSeeker._id,
    });

    if (!resume) {
      return notFoundResponse(res, 'Resume not found');
    }

    // Increment view count
    resume.stats.views += 1;
    await resume.save();

    return successResponse(res, 200, 'Resume fetched successfully', { resume });
  } catch (err) {
    console.error('Get resume error:', err);
    return errorResponse(res, 500, 'Failed to fetch resume');
  }
};

/**
 * PUT /api/resume/:id
 * Update a resume
 */
exports.updateResume = async (req, res) => {
  try {
    const jobSeeker = await JobSeeker.findOne({ user: req.user._id });
    if (!jobSeeker) {
      return notFoundResponse(res, 'Job seeker profile not found');
    }

    const resume = await Resume.findOne({
      _id: req.params.id,
      jobSeeker: jobSeeker._id,
    });

    if (!resume) {
      return notFoundResponse(res, 'Resume not found');
    }

    // Update allowed fields
    const allowedFields = [
      'title', 'templateId', 'personalInfo', 'summary', 'education',
      'workExperience', 'skills', 'certifications', 'projects', 'languages',
      'customSections', 'sectionOrder', 'styling', 'isPublic',
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        resume[field] = req.body[field];
      }
    });

    await resume.save();

    // Regenerate PDF if requested
    if (req.body.regeneratePdf === true) {
      try {
        // Delete old PDF
        if (resume.generatedPdf?.publicId) {
          await deleteFromCloudinary(resume.generatedPdf.publicId);
        }

        // Generate new PDF
        const pdfData = await generateAndUploadResumePDF(resume, jobSeeker._id);
        resume.generatedPdf = pdfData;
        await resume.save();
      } catch (pdfError) {
        console.error('PDF regeneration failed:', pdfError);
      }
    }

    return successResponse(res, 200, 'Resume updated successfully', { resume });
  } catch (err) {
    console.error('Update resume error:', err);
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(e => ({ field: e.path, message: e.message }));
      return validationErrorResponse(res, errors);
    }
    return errorResponse(res, 500, 'Failed to update resume');
  }
};

/**
 * DELETE /api/resume/:id
 * Delete a resume
 */
exports.deleteResume = async (req, res) => {
  try {
    const jobSeeker = await JobSeeker.findOne({ user: req.user._id });
    if (!jobSeeker) {
      return notFoundResponse(res, 'Job seeker profile not found');
    }

    const resume = await Resume.findOne({
      _id: req.params.id,
      jobSeeker: jobSeeker._id,
    });

    if (!resume) {
      return notFoundResponse(res, 'Resume not found');
    }

    // Delete PDF from Cloudinary
    if (resume.generatedPdf?.publicId) {
      try {
        await deleteFromCloudinary(resume.generatedPdf.publicId);
      } catch (err) {
        console.error('Failed to delete PDF from Cloudinary:', err);
      }
    }

    // Remove from jobSeeker's builtResumes
    jobSeeker.builtResumes = jobSeeker.builtResumes.filter(
      id => id.toString() !== resume._id.toString()
    );
    await jobSeeker.save();

    // Delete resume
    await Resume.deleteOne({ _id: resume._id });

    return successResponse(res, 200, 'Resume deleted successfully');
  } catch (err) {
    console.error('Delete resume error:', err);
    return errorResponse(res, 500, 'Failed to delete resume');
  }
};

/**
 * POST /api/resume/:id/generate-pdf
 * Generate/Regenerate PDF for a resume
 */
exports.generatePDF = async (req, res) => {
  try {
    const jobSeeker = await JobSeeker.findOne({ user: req.user._id });
    if (!jobSeeker) {
      return notFoundResponse(res, 'Job seeker profile not found');
    }

    const resume = await Resume.findOne({
      _id: req.params.id,
      jobSeeker: jobSeeker._id,
    });

    if (!resume) {
      return notFoundResponse(res, 'Resume not found');
    }

    // Delete old PDF if exists
    if (resume.generatedPdf?.publicId) {
      try {
        await deleteFromCloudinary(resume.generatedPdf.publicId);
      } catch (err) {
        console.error('Failed to delete old PDF:', err);
      }
    }

    // Generate new PDF
    const pdfData = await generateAndUploadResumePDF(resume, jobSeeker._id);
    resume.generatedPdf = pdfData;
    await resume.save();

    return successResponse(res, 200, 'PDF generated successfully', { 
      pdf: resume.generatedPdf,
    });
  } catch (err) {
    console.error('Generate PDF error:', err);
    return errorResponse(res, 500, 'Failed to generate PDF');
  }
};

/**
 * POST /api/resume/:id/set-default
 * Set a resume as default
 */
exports.setDefault = async (req, res) => {
  try {
    const jobSeeker = await JobSeeker.findOne({ user: req.user._id });
    if (!jobSeeker) {
      return notFoundResponse(res, 'Job seeker profile not found');
    }

    const resume = await Resume.findOne({
      _id: req.params.id,
      jobSeeker: jobSeeker._id,
    });

    if (!resume) {
      return notFoundResponse(res, 'Resume not found');
    }

    // Set as default (pre-save hook will unset others)
    resume.isDefault = true;
    await resume.save();

    return successResponse(res, 200, 'Resume set as default successfully', { resume });
  } catch (err) {
    console.error('Set default resume error:', err);
    return errorResponse(res, 500, 'Failed to set default resume');
  }
};

/**
 * POST /api/resume/:id/download
 * Track download and return PDF URL
 */
exports.downloadResume = async (req, res) => {
  try {
    const jobSeeker = await JobSeeker.findOne({ user: req.user._id });
    if (!jobSeeker) {
      return notFoundResponse(res, 'Job seeker profile not found');
    }

    const resume = await Resume.findOne({
      _id: req.params.id,
      jobSeeker: jobSeeker._id,
    });

    if (!resume) {
      return notFoundResponse(res, 'Resume not found');
    }

    if (!resume.generatedPdf?.url) {
      return errorResponse(res, 404, 'PDF not generated yet. Please generate PDF first.');
    }

    // Increment download count
    resume.stats.downloads += 1;
    await resume.save();

    return successResponse(res, 200, 'Resume download link', { 
      downloadUrl: resume.generatedPdf.url,
      filename: resume.generatedPdf.filename,
    });
  } catch (err) {
    console.error('Download resume error:', err);
    return errorResponse(res, 500, 'Failed to get download link');
  }
};

/**
 * GET /api/resume/:id/preview
 * Get resume data for preview (without incrementing stats)
 */
exports.previewResume = async (req, res) => {
  try {
    const jobSeeker = await JobSeeker.findOne({ user: req.user._id });
    if (!jobSeeker) {
      return notFoundResponse(res, 'Job seeker profile not found');
    }

    const resume = await Resume.findOne({
      _id: req.params.id,
      jobSeeker: jobSeeker._id,
    });

    if (!resume) {
      return notFoundResponse(res, 'Resume not found');
    }

    return successResponse(res, 200, 'Resume preview fetched', { resume });
  } catch (err) {
    console.error('Preview resume error:', err);
    return errorResponse(res, 500, 'Failed to fetch resume preview');
  }
};
