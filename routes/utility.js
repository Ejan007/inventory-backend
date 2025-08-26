/**
 * Utility Routes
 */
const express = require('express');
const router = express.Router();

/**
 * Test endpoint to check connectivity
 */
router.get('/test', (req, res) => {
  res.json({ 
    message: 'Server is running and accessible!',
    timestamp: new Date().toISOString(),
    clientIp: req.ip || req.connection.remoteAddress,
    headers: req.headers
  });
});

module.exports = router;
