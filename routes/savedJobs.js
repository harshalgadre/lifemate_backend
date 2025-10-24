const express = require('express');
const router = express.Router();
const savedJobController = require('../controllers/savedJobController');
const { authenticate, requireJobSeeker } = require('../middlewares/auth');

// Save and unsave by job ID
router.post('/jobs/:id/save', authenticate, requireJobSeeker, savedJobController.save);
router.delete('/jobs/:id/save', authenticate, requireJobSeeker, savedJobController.unsave);

// List saved jobs
router.get('/saved-jobs', authenticate, requireJobSeeker, savedJobController.list);

module.exports = router;
