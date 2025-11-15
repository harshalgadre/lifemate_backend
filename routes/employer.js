const express = require('express');
const router = express.Router();
const employerController = require('../controllers/employerController');
const { authenticate, requireEmployer, optionalAuth } = require('../middlewares/auth');

// Protected routes - Employer profile management (must come before /:id)
router.post('/profile', authenticate, requireEmployer, employerController.createOrUpdateProfile);
router.get('/profile', authenticate, requireEmployer, employerController.getMyProfile);
router.get('/profile/refresh', authenticate, requireEmployer, employerController.refreshProfile);

// Public routes - Browse employers (for jobseekers)
router.get('/all', optionalAuth, employerController.getAllEmployers);
router.get('/:id', optionalAuth, employerController.getEmployerById);

module.exports = router;
