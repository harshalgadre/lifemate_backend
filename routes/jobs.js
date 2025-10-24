const express = require('express');
const router = express.Router();
const jobController = require('../controllers/jobController');
const applicationController = require('../controllers/applicationController');
const { authenticate, optionalAuth, requireEmployerOrAdmin, requireEmployer, requireJobSeeker } = require('../middlewares/auth');

// Public/optional-auth listing and details
router.get('/', optionalAuth, jobController.list);
router.get('/:id', optionalAuth, jobController.getById);

// Employer/admin protected operations
router.post('/', authenticate, requireEmployer, jobController.create);
router.patch('/:id', authenticate, requireEmployerOrAdmin, jobController.update);
router.patch('/:id/status', authenticate, requireEmployerOrAdmin, jobController.changeStatus);
router.delete('/:id', authenticate, requireEmployerOrAdmin, jobController.remove);

// Jobseeker applies to a job
router.post('/:id/apply', authenticate, requireJobSeeker, applicationController.apply);

module.exports = router;
