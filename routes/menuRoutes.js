const express = require('express');
const router = express.Router();
const menuController = require('../controllers/menuController');
const {
  authenticateToken,
  authorizeRoles,
} = require('../middlewares/authMiddleware');

const adminOnly = authorizeRoles([1]);

// Public
router.get('/', menuController.getAllMenus);
router.get('/:id', menuController.getMenusById);

// Admin
router.post(
  '/create',
  authenticateToken,
  adminOnly,
  menuController.createMenu
);
router.put(
  '/:id',
  authenticateToken,
  adminOnly,
  menuController.updateMenu
);
router.delete(
  '/:id',
  authenticateToken,
  adminOnly,
  menuController.deleteMenu
);

module.exports = router;