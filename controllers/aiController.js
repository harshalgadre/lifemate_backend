const Resume = require('../models/Resume');
const Job = require('../models/Job');
const { generateResumeSummary } = require('../services/ai/summaryChain');
const { calculateMatchScore } = require('../services/ai/matchScorer');
const { semanticJobSearch } = require('../services/ai/semanticSearch');
const { embedJob, batchIndexJobs, getEmbeddingStats } = require('../services/ai/jobEmbeddingPipeline');
const { successResponse, errorResponse, notFoundResponse } = require('../utils/response');
const { aiConfig } = require('../config/ai');

// ═══════════════════════════════════════════════════════
// FEATURE 1: AI Resume Summary Generator
// ═══════════════════════════════════════════════════════

/**
 * @route   POST /api/ai/generate-summary
 * @desc    Generate an AI-powered professional summary for a resume
 * @access  Private (JobSeeker)
 */
exports.generateResumeSummary = async (req, res) => {
  try {
    const userId = req.user._id;
    const { resumeId, tone, saveToResume } = req.body;

    if (!resumeId) {
      return errorResponse(res, 400, 'resumeId is required');
    }

    const selectedTone = tone || aiConfig.summary.defaultTone;
    if (!aiConfig.summary.allowedTones.includes(selectedTone)) {
      return errorResponse(
        res,
        400,
        `Invalid tone: "${tone}". Allowed values: ${aiConfig.summary.allowedTones.join(', ')}`
      );
    }

    if (!aiConfig.features.resumeSummary) {
      return errorResponse(res, 503, 'AI Resume Summary feature is currently disabled');
    }

    const resume = await Resume.findOne({ _id: resumeId, userId });
    if (!resume) {
      return notFoundResponse(res, 'Resume not found or you do not have access to it');
    }

    const generatedSummary = await generateResumeSummary(resume.toObject(), selectedTone);

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
    if (error.message && error.message.includes('GROQ_API_KEY')) {
      return errorResponse(res, 503, 'AI service is not configured. Please contact the administrator.');
    }
    if (error.message && error.message.includes('quota')) {
      return errorResponse(res, 429, 'AI service rate limit exceeded. Please try again later.');
    }
    return errorResponse(res, 500, 'Failed to generate resume summary. Please try again.');
  }
};

// ═══════════════════════════════════════════════════════
// FEATURE 2: Smart Job-Resume Match Scorer
// ═══════════════════════════════════════════════════════

/**
 * @route   POST /api/ai/match-score
 * @desc    Calculate AI-powered match score between a resume and a job posting
 * @access  Private (JobSeeker)
 */
exports.calculateMatchScore = async (req, res) => {
  try {
    const userId = req.user._id;
    const { resumeId, jobId } = req.body;

    if (!resumeId) return errorResponse(res, 400, 'resumeId is required');
    if (!jobId) return errorResponse(res, 400, 'jobId is required');

    if (!aiConfig.features.matchScorer) {
      return errorResponse(res, 503, 'AI Match Scorer feature is currently disabled');
    }

    const resume = await Resume.findOne({ _id: resumeId, userId });
    if (!resume) {
      return notFoundResponse(res, 'Resume not found or you do not have access to it');
    }

    const job = await Job.findById(jobId);
    if (!job) {
      return notFoundResponse(res, 'Job posting not found');
    }

    const matchResult = await calculateMatchScore(resume.toObject(), job.toObject());

    return successResponse(res, 200, 'Match score calculated successfully', {
      matchResult,
      resumeId: resume._id,
      jobId: job._id,
      jobTitle: job.title,
      candidateName: resume.personalInfo?.fullName || 'Unknown',
    });
  } catch (error) {
    console.error('AI Match Score Error:', error);
    if (error.message && error.message.includes('GROQ_API_KEY')) {
      return errorResponse(res, 503, 'AI service is not configured. Please contact the administrator.');
    }
    if (error.message && error.message.includes('quota')) {
      return errorResponse(res, 429, 'AI service rate limit exceeded. Please try again later.');
    }
    if (error.message && error.message.includes('parse')) {
      return errorResponse(res, 500, 'AI returned an unexpected response format. Please try again.');
    }
    return errorResponse(res, 500, 'Failed to calculate match score. Please try again.');
  }
};

// ═══════════════════════════════════════════════════════
// FEATURE 4: Semantic Job Search (RAG)
// ═══════════════════════════════════════════════════════

/**
 * @route   POST /api/ai/semantic-search
 * @desc    Natural language semantic job search using RAG pipeline
 * @access  Private (JobSeeker)
 *
 * Body:
 *   query   {string}  - Natural language search query (required, min 2 chars)
 *   limit   {number}  - Number of results (1-20, default 8)
 *   explain {boolean} - Include AI explanations per job (default true)
 */
exports.semanticSearch = async (req, res) => {
  try {
    if (!aiConfig.features.semanticSearch) {
      return errorResponse(res, 503, 'Semantic Search feature is currently disabled');
    }

    const { query, limit, explain } = req.body;

    if (!query || typeof query !== 'string' || query.trim().length < 2) {
      return errorResponse(res, 400, 'A search query of at least 2 characters is required');
    }

    const parsedLimit = Math.min(Math.max(parseInt(limit) || 8, 1), 20);
    const generateExplanations = explain !== false; // default true

    const searchResult = await semanticJobSearch(query, {
      limit: parsedLimit,
      generateExplanations,
    });

    return successResponse(res, 200, 'Semantic search completed successfully', searchResult);
  } catch (error) {
    console.error('AI Semantic Search Error:', error);

    if (error.message && error.message.includes('embedding model')) {
      return errorResponse(res, 503, 'Embedding model is loading. Please try again in a few seconds.');
    }
    if (error.message && error.message.includes('GROQ_API_KEY')) {
      return errorResponse(res, 503, 'AI service is not configured. Please contact the administrator.');
    }
    return errorResponse(res, 500, 'Semantic search failed. Please try again.');
  }
};

/**
 * @route   POST /api/ai/index-job/:jobId
 * @desc    Generate and store embedding for a single job
 * @access  Private (Employer or Admin)
 *
 * Called automatically after a job is created or updated (via job controller hook)
 */
exports.indexJob = async (req, res) => {
  try {
    if (!aiConfig.features.semanticSearch) {
      return errorResponse(res, 503, 'Semantic Search feature is currently disabled');
    }

    const { jobId } = req.params;

    if (!jobId) {
      return errorResponse(res, 400, 'jobId is required');
    }

    const job = await Job.findById(jobId);
    if (!job) {
      return notFoundResponse(res, 'Job not found');
    }

    const result = await embedJob(jobId);

    return successResponse(res, 200, 'Job indexed successfully for semantic search', result);
  } catch (error) {
    console.error('AI Index Job Error:', error);

    if (error.message && error.message.includes('embedding model')) {
      return errorResponse(res, 503, 'Embedding model is loading. Please try again in a few seconds.');
    }
    return errorResponse(res, 500, 'Failed to index job. Please try again.');
  }
};

/**
 * @route   POST /api/ai/batch-index-jobs
 * @desc    Admin endpoint — batch embed all Active jobs without embeddings
 * @access  Private (Admin only)
 *
 * Body:
 *   reindexAll {boolean} - Re-embed ALL jobs, not just missing ones (default false)
 *
 * Returns 202 immediately, runs batch async in background
 */
exports.batchIndexJobs = async (req, res) => {
  try {
    if (!aiConfig.features.semanticSearch) {
      return errorResponse(res, 503, 'Semantic Search feature is currently disabled');
    }

    const { reindexAll } = req.body;

    // Return 202 Accepted immediately — batch runs in background
    res.status(202).json({
      success: true,
      message: 'Batch indexing started in background. Check /api/ai/embedding-stats for progress.',
      reindexAll: reindexAll === true,
    });

    // Non-blocking background execution
    batchIndexJobs({ reindexAll: reindexAll === true }).catch((err) => {
      console.error('Batch indexing failed:', err);
    });
  } catch (error) {
    console.error('AI Batch Index Error:', error);
    return errorResponse(res, 500, 'Failed to start batch indexing.');
  }
};

/**
 * @route   GET /api/ai/embedding-stats
 * @desc    Get embedding coverage statistics for the jobs collection
 * @access  Private (Admin only)
 */
exports.getEmbeddingStats = async (req, res) => {
  try {
    const stats = await getEmbeddingStats();

    return successResponse(res, 200, 'Embedding statistics retrieved', {
      ...stats,
      embeddingModel: aiConfig.embedding.model,
      vectorIndexName: aiConfig.embedding.vectorIndexName,
      dimensions: aiConfig.embedding.dimensions,
    });
  } catch (error) {
    console.error('AI Embedding Stats Error:', error);
    return errorResponse(res, 500, 'Failed to retrieve embedding statistics.');
  }
};
