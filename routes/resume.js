const express = require('express');
const router = express.Router();
const resumeController = require('../controllers/resumeController');
const { authenticate, requireJobSeeker } = require('../middlewares/auth');

// Get available templates
router.get('/templates', authenticate, requireJobSeeker, resumeController.getTemplates);

// CRUD operations for resumes
router.post('/build', authenticate, requireJobSeeker, resumeController.createResume);
router.get('/list', authenticate, requireJobSeeker, resumeController.getMyResumes);
router.get('/:id', authenticate, requireJobSeeker, resumeController.getResume);
router.get('/:id/preview', authenticate, requireJobSeeker, resumeController.previewResume);
router.put('/:id', authenticate, requireJobSeeker, resumeController.updateResume);
router.delete('/:id', authenticate, requireJobSeeker, resumeController.deleteResume);

// PDF operations
router.post('/:id/generate-pdf', authenticate, requireJobSeeker, resumeController.generatePDF);
router.post('/:id/download', authenticate, requireJobSeeker, resumeController.downloadResume);

// Set default resume
router.post('/:id/set-default', authenticate, requireJobSeeker, resumeController.setDefault);

module.exports = router;
