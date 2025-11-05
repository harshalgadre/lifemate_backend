const express = require('express');
const router = express.Router();
const resumeController = require('../controllers/resumeController');
const { authenticate, requireJobSeeker } = require('../middlewares/auth');

// List all resumes
router.get('/list', authenticate, requireJobSeeker, resumeController.listResumes);

// Build/Create new resume
router.post('/build', authenticate, requireJobSeeker, resumeController.buildResume);

// Get single resume (for editing)
router.get('/:id', authenticate, requireJobSeeker, resumeController.getResume);

// Update resume
router.put('/:id', authenticate, requireJobSeeker, resumeController.updateResume);

// Delete resume
router.delete('/:id', authenticate, requireJobSeeker, resumeController.deleteResume);

// Preview resume (increments views)
router.get('/:id/preview', authenticate, requireJobSeeker, resumeController.previewResume);

// Download resume (generates PDF, increments downloads)
router.post('/:id/download', authenticate, requireJobSeeker, resumeController.downloadResume);

// Generate PDF
router.post('/:id/generate-pdf', authenticate, requireJobSeeker, resumeController.generatePDF);

// Set default resume
router.post('/:id/set-default', authenticate, requireJobSeeker, resumeController.setDefaultResume);

module.exports = router;
