const express = require('express');
const router = express.Router();
const menuController = require('../controllers/menuController');
const {
  authenticateToken,
  authorizeRoles,
} = require('../middlewares/authMiddleware');
const { multerUpload } = require('../middlewares/uploads');

const adminOnly = authorizeRoles([1]);

// Public
router.get('/', menuController.getAllMenus);
router.get('/:id', menuController.getMenusById);

// Admin
router.post(
  '/create',
  multerUpload.single('image'),
  authenticateToken,
  adminOnly,
  menuController.createMenu
);
router.put(
  '/:id',
  multerUpload.single('image'),
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