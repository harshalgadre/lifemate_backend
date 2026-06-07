const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { authenticate, requireJobSeeker } = require('../middlewares/auth');

// AI Routes

// Feature 1: Generate AI resume summary
// POST /api/ai/generate-summary
router.post(
  '/generate-summary',
  authenticate,
  requireJobSeeker,
  aiController.generateResumeSummary
);

// Feature 2: Calculate job-resume match score
// POST /api/ai/match-score
router.post(
  '/match-score',
  authenticate,
  requireJobSeeker,
  aiController.calculateMatchScore
);

module.exports = router;

