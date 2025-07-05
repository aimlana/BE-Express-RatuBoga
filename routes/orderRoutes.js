const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/authMiddleware');
const {
  createOrder,
  getAllOrders,
  getOrderById,
  getPublicOrderById,
  updateOrderStatus,
  confirmCashPayment,
  getReport,
} = require('../controllers/orderController');

// Public routes (no authentication)
router.post('/', createOrder); 
router.get('/public/:id', getPublicOrderById)

// Admin routes (require authentication)
router.get('/', authenticateToken, getAllOrders);
router.get('/:id', authenticateToken, getOrderById);
router.put('/:id/status', authenticateToken, updateOrderStatus);
router.patch('/:id/confirm-payment', authenticateToken, confirmCashPayment);
router.get('/report', authenticateToken, getReport);

module.exports = router;
