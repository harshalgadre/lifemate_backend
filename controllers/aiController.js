const Resume = require('../models/Resume');
const { generateResumeSummary } = require('../services/ai/summaryChain');
const { successResponse, errorResponse, notFoundResponse } = require('../utils/response');
const { aiConfig } = require('../config/ai');

/**
 * @route   POST /api/ai/generate-summary
 * @desc    Generate an AI-powered professional summary for a resume
 * @access  Private (JobSeeker)
 */
exports.generateResumeSummary = async (req, res) => {
  try {
    const userId = req.user._id;
    const { resumeId, tone, saveToResume } = req.body;

    // Validate required fields
    if (!resumeId) {
      return errorResponse(res, 400, 'resumeId is required');
    }

    // Validate tone if provided
    const selectedTone = tone || aiConfig.summary.defaultTone;
    if (!aiConfig.summary.allowedTones.includes(selectedTone)) {
      return errorResponse(
        res,
        400,
        `Invalid tone: "${tone}". Allowed values: ${aiConfig.summary.allowedTones.join(', ')}`
      );
    }

    // Check if AI feature is enabled
    if (!aiConfig.features.resumeSummary) {
      return errorResponse(res, 503, 'AI Resume Summary feature is currently disabled');
    }

    // Fetch the resume and verify ownership
    const resume = await Resume.findOne({ _id: resumeId, userId });

    if (!resume) {
      return notFoundResponse(res, 'Resume not found or you do not have access to it');
    }

    // Generate the summary using AI
    const generatedSummary = await generateResumeSummary(resume.toObject(), selectedTone);

    // Optionally save the generated summary to the resume
    let savedToResume = false;
    if (saveToResume) {
      resume.summary = generatedSummary;
      await resume.save();
      savedToResume = true;
    }

    return successResponse(res, 200, 'Resume summary generated successfully', {
      summary: generatedSummary,
      tone: selectedTone,
      resumeId: resume._id,
      savedToResume,
    });
  } catch (error) {
    console.error('AI Generate Summary Error:', error);

    // Handle specific AI-related errors
    if (error.message && error.message.includes('GOOGLE_GENAI_API_KEY')) {
      return errorResponse(res, 503, 'AI service is not configured. Please contact the administrator.');
    }

    if (error.message && error.message.includes('quota')) {
      return errorResponse(res, 429, 'AI service rate limit exceeded. Please try again later.');
    }

    return errorResponse(res, 500, 'Failed to generate resume summary. Please try again.');
  }
};
