const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticateToken } = require('../middlewares/authMiddleware');

// Pastikan menggunakan '/payments' (plural)
router.get('/',  authenticateToken, paymentController.getAllPayments);
router.get('/:orderId', authenticateToken, paymentController.getPaymentByOrderId);

module.exports = router;
