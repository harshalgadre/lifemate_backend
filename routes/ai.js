const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { authenticate, requireJobSeeker, requireAdmin } = require('../middlewares/auth');

// ─────────────────────────────────────────────────────────────
// FEATURE 1: AI Resume Summary Generator
// ─────────────────────────────────────────────────────────────

/**
 * POST /api/ai/generate-summary
 * Generate an AI professional summary from a resume
 * Body: { resumeId, tone?, saveToResume? }
 */
router.post(
  '/generate-summary',
  authenticate,
  requireJobSeeker,
  aiController.generateResumeSummary
);

// ─────────────────────────────────────────────────────────────
// FEATURE 2: Smart Job-Resume Match Scorer
// ─────────────────────────────────────────────────────────────

/**
 * POST /api/ai/match-score
 * Calculate AI-powered compatibility score between a resume and a job
 * Body: { resumeId, jobId }
 */
router.post(
  '/match-score',
  authenticate,
  requireJobSeeker,
  aiController.calculateMatchScore
);

// ─────────────────────────────────────────────────────────────
// FEATURE 4: Semantic Job Search (RAG)
// ─────────────────────────────────────────────────────────────

/**
 * POST /api/ai/semantic-search
 * Natural language semantic job search using vector embeddings + LLM re-ranking
 * Body: { query, limit?, explain? }
 */
router.post(
  '/semantic-search',
  authenticate,
  requireJobSeeker,
  aiController.semanticSearch
);

/**
 * POST /api/ai/index-job/:jobId
 * Generate and store vector embedding for a single job
 * Called after job create/update by employers or admins
 */
router.post(
  '/index-job/:jobId',
  authenticate,
  aiController.indexJob
);

/**
 * POST /api/ai/batch-index-jobs
 * Admin: batch-embed all active jobs without embeddings (runs in background)
 * Body: { reindexAll? }
 */
router.post(
  '/batch-index-jobs',
  authenticate,
  requireAdmin,
  aiController.batchIndexJobs
);

/**
 * GET /api/ai/embedding-stats
 * Admin: get vector indexing coverage statistics
 */
router.get(
  '/embedding-stats',
  authenticate,
  requireAdmin,
  aiController.getEmbeddingStats
);

module.exports = router;
