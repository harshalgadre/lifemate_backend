const express = require('express');
const router = express.Router();
const applicationController = require('../controllers/applicationController');
const { authenticate, requireJobSeeker, requireEmployer, requireEmployerOrAdmin } = require('../middlewares/auth');

// Jobseeker - list own applications => /api/applications/me
router.get('/me', authenticate, requireJobSeeker, applicationController.listMyApplications);

// Employer - list applications to employer's jobs => /api/applications/employer
router.get('/employer', authenticate, requireEmployer, applicationController.listEmployerApplications);
// Employer - view applications for a specific job
router.get('/job/:jobId', authenticate, requireEmployer, applicationController.listApplicationsForJob);


// Get application by id (controller validates ownership) => /api/applications/:id
router.get('/:id', authenticate, applicationController.getById);

// Employer/Admin updates application status => /api/applications/:id/status
router.patch('/:id/status', authenticate, requireEmployerOrAdmin, applicationController.updateStatus);

// Employer/Admin rates an application => /api/applications/:id/rating
router.patch('/:id/rating', authenticate, requireEmployerOrAdmin, applicationController.setRating);

module.exports = router;