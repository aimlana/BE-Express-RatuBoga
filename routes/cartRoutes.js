const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/authMiddleware');
const {
  addItem,
  updateItem,
  removeItem,
  getUserCart,
  clearCart,
} = require('../controllers/cartController');

// Semua route cart membutuhkan authentication
router.get('/', authenticateToken, getUserCart);
router.post('/items', authenticateToken, addItem);
router.put('/items/:id', authenticateToken, updateItem);
router.delete('/items/:id', authenticateToken, removeItem);
router.delete('/clear', authenticateToken, clearCart);

module.exports = router;
