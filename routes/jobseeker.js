const express = require('express');
const router = express.Router();
const jobSeekerController = require('../controllers/jobSeekerController');
const { authenticate, requireJobSeeker } = require('../middlewares/auth');
const { uploadDocument } = require('../middlewares/upload');

router.get('/profile', authenticate, requireJobSeeker, jobSeekerController.getMyProfile);

router.post('/resume', authenticate, requireJobSeeker, uploadDocument.single('resume'), jobSeekerController.uploadResume);
router.delete('/resume', authenticate, requireJobSeeker, jobSeekerController.deleteResume);

router.post('/cover-letter', authenticate, requireJobSeeker, uploadDocument.single('coverLetter'), jobSeekerController.uploadCoverLetter);
router.delete('/cover-letter', authenticate, requireJobSeeker, jobSeekerController.deleteCoverLetter);

module.exports = router;
