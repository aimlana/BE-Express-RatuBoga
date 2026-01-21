const express = require('express');
const router = express.Router();
const {
  authenticateToken,
  requireAdmin,
  requireAuth,
} = require('../middlewares/authMiddleware');
const {
  validateTableNumber,
  createOrder,
  createOrderGuest,
  getAllOrders,
  getOrderById,
  getPublicOrderById,
  updateOrderStatus,
  confirmCashPayment,
  getReport,
} = require('../controllers/orderController');

// untuk guest
router.post('/guest', createOrderGuest);

// Public
router.post('/', authenticateToken, createOrder); 
router.get('/public/:id', getPublicOrderById);
router.get('/validate-table/:tableNumber', validateTableNumber);

// Admin routes (require authentication + admin role)
router.get('/', authenticateToken, requireAdmin, getAllOrders);
router.get('/:id', authenticateToken, requireAuth, getOrderById);
router.put('/:id/status', authenticateToken, requireAdmin, updateOrderStatus);
router.patch(
  '/:id/confirm-payment',
  authenticateToken,
  requireAdmin,
  confirmCashPayment
);
router.get('/admin/report', authenticateToken, requireAdmin, getReport);

module.exports = router;
