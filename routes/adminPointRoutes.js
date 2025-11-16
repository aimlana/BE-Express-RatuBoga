const express = require('express');
const router = express.Router();
const {
  authenticateToken,
  requireAdmin,
} = require('../middlewares/authMiddleware');
const { addPointsToUser } = require('../controllers/pointController');

// Admin point management
router.post('/add-points', authenticateToken, requireAdmin, addPointsToUser);

module.exports = router;
