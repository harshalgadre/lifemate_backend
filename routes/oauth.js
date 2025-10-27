const express = require('express');
const router = express.Router();
const oauthController = require('../controllers/oauthController');

// Start Google OAuth flow
router.get('/google', oauthController.startGoogle);

// Google OAuth callback
router.get('/google/callback', oauthController.googleCallback);

router.get('/google/failure', (req, res) => {
  return oauthController.googleFailure(req, res);
});

module.exports = router;


