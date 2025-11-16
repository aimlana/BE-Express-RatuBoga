const express = require('express');
const router = express.Router();
const {
  authenticateToken,
  requireAuth,
} = require('../middlewares/authMiddleware');
const {
  getUserPoints,
  redeemPointsForCoupon,
  getUserCoupons,
  getAvailableCouponsForRedemption,
} = require('../controllers/pointController');

// User routes (require login)
router.get('/points', authenticateToken, requireAuth, getUserPoints);
router.get('/coupons', authenticateToken, requireAuth, getUserCoupons);
router.get(
  '/coupons/available',
  authenticateToken,
  requireAuth,
  getAvailableCouponsForRedemption
);
router.post('/redeem', authenticateToken, requireAuth, redeemPointsForCoupon);

module.exports = router;
