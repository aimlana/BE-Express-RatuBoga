const express = require('express');
const router = express.Router();
const menuController = require('../controllers/menuController');
const {
  authenticateToken
} = require('../middlewares/authMiddleware');
const { multerUpload } = require('../middlewares/uploads');


// Public
router.get('/search', menuController.searchMenus);
router.get('/', menuController.getAllMenus);
router.get('/:id', menuController.getMenusById);

// Admin
router.post(
  '/create',
  multerUpload.single('image'),
  authenticateToken,
  menuController.createMenu
);
router.put(
  '/:id',
  multerUpload.single('image'),
  authenticateToken,
  menuController.updateMenu
);
router.delete(
  '/:id',
  authenticateToken,
  menuController.deleteMenu
);

module.exports = router;