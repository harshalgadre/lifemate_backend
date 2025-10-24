const express = require('express');
const router = express.Router();
const employerController = require('../controllers/employerController');
const { authenticate, requireEmployer } = require('../middlewares/auth');

// Create or update employer profile
router.post('/profile', authenticate, requireEmployer, employerController.createOrUpdateProfile);
router.get('/profile', authenticate, requireEmployer, employerController.getMyProfile);

module.exports = router;
