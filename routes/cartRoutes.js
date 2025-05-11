const express = require('express');
const router = express.Router();
const CartController = require('../controllers/cartController');
const { authenticateToken } = require('../middlewares/authMiddleware');

router.use(authenticateToken);

router.get('/', CartController.getUserCart);
router.post('/items', CartController.addItem);
router.put('/items/:id', CartController.updateItem);
router.delete('/items/:id', CartController.removeItem);

module.exports = router;
