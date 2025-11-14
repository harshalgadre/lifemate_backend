const express = require('express');
const router = express.Router();
const jobController = require('../controllers/jobController');
const applicationController = require('../controllers/applicationController');
const { authenticate, optionalAuth, requireEmployerOrAdmin, requireEmployer, requireJobSeeker, requireEmployerVerification } = require('../middlewares/auth');
const { uploadDocument } = require('../middlewares/upload');

// Public/optional-auth listing and details
router.get('/', optionalAuth, jobController.list);
// Employer-only listing (jobs created by authenticated employer)
// Place this before the '/:id' param route so 'my' isn't treated as an id
router.get('/my', authenticate, requireEmployer, jobController.listByEmployer);

router.get('/:id', optionalAuth, jobController.getById);

// Employer/admin protected operations
router.post('/', authenticate, requireEmployerVerification, jobController.create);
router.patch('/:id', authenticate, requireEmployerOrAdmin, jobController.update);
router.patch('/:id/status', authenticate, requireEmployerOrAdmin, jobController.changeStatus);
router.delete('/:id', authenticate, requireEmployerOrAdmin, jobController.remove);

// Jobseeker applies to a job (supports multipart resume/cover letter file)
router.post(
  '/:id/apply',
  authenticate,
  requireJobSeeker,
  uploadDocument.fields([
    { name: 'resume', maxCount: 1 },
    { name: 'coverLetterFile', maxCount: 1 }
  ]),
  applicationController.apply
);

module.exports = router;
