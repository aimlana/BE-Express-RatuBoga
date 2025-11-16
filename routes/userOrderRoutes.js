const express = require('express');
const router = express.Router();
const {
  authenticateToken,
  requireAuth,
} = require('../middlewares/authMiddleware');
const {
  getUserOrderHistory,
  validateCouponForOrder,
} = require('../controllers/orderController');

// User order routes
router.get('/orders', authenticateToken, requireAuth, getUserOrderHistory);
router.post(
  '/validate-coupon',
  authenticateToken,
  requireAuth,
  validateCouponForOrder
);

module.exports = router;
