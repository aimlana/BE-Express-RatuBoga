const express = require('express');
const router = express.Router();
const {
  authenticateToken,
  requireAdmin,
} = require('../middlewares/authMiddleware');
const {
  getAllCoupons,
  getCouponById,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  getCouponStats,
} = require('../controllers/couponController');

// Admin only routes
router.get('/', authenticateToken, requireAdmin, getAllCoupons);
router.get('/stats', authenticateToken, requireAdmin, getCouponStats);
router.get('/:id', authenticateToken, requireAdmin, getCouponById);
router.post('/', authenticateToken, requireAdmin, createCoupon);
router.put('/:id', authenticateToken, requireAdmin, updateCoupon);
router.delete('/:id', authenticateToken, requireAdmin, deleteCoupon);

module.exports = router;
