const Resume = require('../models/Resume');
const JobSeeker = require('../models/JobSeeker');
const { generateAndUploadResumePDF } = require('../services/pdfService');
const { cloudinary } = require('../config/cloudinary');

/**
 * @route   GET /api/resume/list
 * @desc    Get all resumes for logged-in user
 * @access  Private (JobSeeker)
 */
exports.listResumes = async (req, res) => {
  try {
    const userId = req.user._id;

    const resumes = await Resume.find({ userId })
      .select('title personalInfo isDefault stats createdAt updatedAt')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: { resumes }
    });
  } catch (error) {
    console.error('List resumes error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch resumes'
    });
  }
};

/**
 * @route   POST /api/resume/build
 * @desc    Create new resume (with auto-populate option)
 * @access  Private (JobSeeker)
 */
exports.buildResume = async (req, res) => {
  try {
    const userId = req.user._id;
    const { title, autoPopulate, personalInfo, summary, styling } = req.body;

    let resumeData = {
      userId,
      title: title || 'My Resume',
      personalInfo,
      summary,
      styling,
      workExperience: [],
      education: [],
      skills: [],
      certifications: [],
      projects: []
    };

    // Auto-populate from JobSeeker profile if requested
    if (autoPopulate) {
      const jobSeeker = await JobSeeker.findOne({ user: userId })
        .populate('user', 'firstName lastName email');

      if (jobSeeker) {
        // Populate personal info
        resumeData.personalInfo = {
          fullName: `${jobSeeker.user.firstName} ${jobSeeker.user.lastName}`,
          email: jobSeeker.user.email,
          phone: jobSeeker.phone || personalInfo?.phone || '',
          linkedIn: jobSeeker.linkedIn || personalInfo?.linkedIn || '',
          github: personalInfo?.github || '',
          website: personalInfo?.website || '',
          address: jobSeeker.address || personalInfo?.address || {}
        };

        // Populate work experience
        if (jobSeeker.workExperience) {
          resumeData.workExperience = jobSeeker.workExperience;
        }

        // Populate education
        if (jobSeeker.education) {
          resumeData.education = jobSeeker.education;
        }

        // Populate skills
        if (jobSeeker.skills) {
          resumeData.skills = jobSeeker.skills;
        }

        // Populate certifications
        if (jobSeeker.certifications) {
          resumeData.certifications = jobSeeker.certifications;
        }

        // Populate summary
        if (jobSeeker.summary) {
          resumeData.summary = jobSeeker.summary;
        }
      }
    }

    // Create resume
    const resume = await Resume.create(resumeData);

    res.status(201).json({
      success: true,
      data: { resume }
    });
  } catch (error) {
    console.error('Build resume error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create resume',
      error: error.message
    });
  }
};

/**
 * @route   GET /api/resume/:id
 * @desc    Get single resume by ID
 * @access  Private (JobSeeker)
 */
exports.getResume = async (req, res) => {
  try {
    const userId = req.user._id;
    const resumeId = req.params.id;

    const resume = await Resume.findOne({ _id: resumeId, userId });

    if (!resume) {
      return res.status(404).json({
        success: false,
        message: 'Resume not found'
      });
    }

    res.json({
      success: true,
      data: { resume }
    });
  } catch (error) {
    console.error('Get resume error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch resume'
    });
  }
};

/**
 * @route   PUT /api/resume/:id
 * @desc    Update resume
 * @access  Private (JobSeeker)
 */
exports.updateResume = async (req, res) => {
  try {
    const userId = req.user._id;
    const resumeId = req.params.id;
    const { regeneratePdf, ...updateData } = req.body;

    const resume = await Resume.findOne({ _id: resumeId, userId });

    if (!resume) {
      return res.status(404).json({
        success: false,
        message: 'Resume not found'
      });
    }

    // Sanitize payload to prevent version/concurrency issues and protected field updates
    // Remove fields that must never be set by client
    const protectedFields = [
      '_id',
      'userId',
      '__v',
      'createdAt',
      'updatedAt',
      'stats',
      'pdfUrl',
      'pdfPublicId'
    ];
    for (const field of protectedFields) {
      if (field in updateData) delete updateData[field];
    }

    // Update resume fields
    Object.assign(resume, updateData);
    await resume.save();

    // Regenerate PDF if requested
    if (regeneratePdf) {
      try {
        const jobSeeker = await JobSeeker.findOne({ user: userId });
        const pdfResult = await generateAndUploadResumePDF(
          resume.toObject(),
          jobSeeker._id.toString()
        );
        
        resume.pdfUrl = pdfResult.url;
        resume.pdfPublicId = pdfResult.publicId;
        await resume.save();
      } catch (pdfError) {
        console.error('PDF regeneration error:', pdfError);
        // Don't fail the update if PDF generation fails
      }
    }

    res.json({
      success: true,
      data: { resume }
    });
  } catch (error) {
    console.error('Update resume error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update resume'
    });
  }
};

/**
 * @route   DELETE /api/resume/:id
 * @desc    Delete resume
 * @access  Private (JobSeeker)
 */
exports.deleteResume = async (req, res) => {
  try {
    const userId = req.user._id;
    const resumeId = req.params.id;

    const resume = await Resume.findOne({ _id: resumeId, userId });

    if (!resume) {
      return res.status(404).json({
        success: false,
        message: 'Resume not found'
      });
    }

    // Delete PDF from Cloudinary if exists
    if (resume.pdfPublicId) {
      try {
        await cloudinary.uploader.destroy(resume.pdfPublicId, {
          resource_type: 'raw'
        });
      } catch (cloudinaryError) {
        console.error('Cloudinary delete error:', cloudinaryError);
      }
    }

    await resume.deleteOne();

    res.json({
      success: true,
      message: 'Resume deleted successfully'
    });
  } catch (error) {
    console.error('Delete resume error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete resume'
    });
  }
};

/**
 * @route   GET /api/resume/:id/preview
 * @desc    Get resume for preview (increments view count)
 * @access  Private (JobSeeker)
 */
exports.previewResume = async (req, res) => {
  try {
    const userId = req.user._id;
    const resumeId = req.params.id;

    const resume = await Resume.findOne({ _id: resumeId, userId });

    if (!resume) {
      return res.status(404).json({
        success: false,
        message: 'Resume not found'
      });
    }

    // Increment view count
    resume.stats.views += 1;
    await resume.save();

    res.json({
      success: true,
      data: { resume }
    });
  } catch (error) {
    console.error('Preview resume error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load resume preview'
    });
  }
};

/**
 * @route   POST /api/resume/:id/download
 * @desc    Download resume PDF (generates if not exists)
 * @access  Private (JobSeeker)
 */
exports.downloadResume = async (req, res) => {
  try {
    const userId = req.user._id;
    const resumeId = req.params.id;

    const resume = await Resume.findOne({ _id: resumeId, userId });

    if (!resume) {
      return res.status(404).json({
        success: false,
        message: 'Resume not found'
      });
    }

    // Increment download count
    resume.stats.downloads += 1;

    // Generate PDF if doesn't exist or is outdated
    if (!resume.pdfUrl) {
      const jobSeeker = await JobSeeker.findOne({ user: userId });
      
      const pdfResult = await generateAndUploadResumePDF(
        resume.toObject(),
        jobSeeker._id.toString()
      );

      resume.pdfUrl = pdfResult.url;
      resume.pdfPublicId = pdfResult.publicId;
    }

    await resume.save();

    res.json({
      success: true,
      data: {
        downloadUrl: resume.pdfUrl
      }
    });
  } catch (error) {
    console.error('Download resume error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download resume',
      error: error.message
    });
  }
};

/**
 * @route   POST /api/resume/:id/generate-pdf
 * @desc    Manually generate/regenerate PDF
 * @access  Private (JobSeeker)
 */
exports.generatePDF = async (req, res) => {
  try {
    const userId = req.user._id;
    const resumeId = req.params.id;

    const resume = await Resume.findOne({ _id: resumeId, userId });

    if (!resume) {
      return res.status(404).json({
        success: false,
        message: 'Resume not found'
      });
    }

    const jobSeeker = await JobSeeker.findOne({ user: userId });

    // Generate PDF
    const pdfResult = await generateAndUploadResumePDF(
      resume.toObject(),
      jobSeeker._id.toString()
    );

    // Update resume with new PDF URL
    resume.pdfUrl = pdfResult.url;
    resume.pdfPublicId = pdfResult.publicId;
    await resume.save();

    res.json({
      success: true,
      data: {
        pdfUrl: resume.pdfUrl
      }
    });
  } catch (error) {
    console.error('Generate PDF error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate PDF',
      error: error.message
    });
  }
};

/**
 * @route   POST /api/resume/:id/set-default
 * @desc    Set resume as default
 * @access  Private (JobSeeker)
 */
exports.setDefaultResume = async (req, res) => {
  try {
    const userId = req.user._id;
    const resumeId = req.params.id;

    const resume = await Resume.findOne({ _id: resumeId, userId });

    if (!resume) {
      return res.status(404).json({
        success: false,
        message: 'Resume not found'
      });
    }

    // Unset all other resumes as default
    await Resume.updateMany(
      { userId, _id: { $ne: resumeId } },
      { isDefault: false }
    );

    // Set this resume as default
    resume.isDefault = true;
    await resume.save();

    res.json({
      success: true,
      message: 'Resume set as default'
    });
  } catch (error) {
    console.error('Set default resume error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to set default resume'
    });
  }
};

// All functions are already exported using exports.functionName above
// No need for module.exports at the end
