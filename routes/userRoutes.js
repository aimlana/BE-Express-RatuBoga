const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const {
  authenticateToken,
  authorizeRoles,
} = require('../middlewares/authMiddleware');

// Admin-only routes
router.get(
  '/',
  authenticateToken,
  authorizeRoles([1]),
  userController.getAllUsers
);
router.get(
  '/:uuid',
  authenticateToken,
  authorizeRoles([1]),
  userController.getUserByUuid
);
router.post(
  '/',
  authenticateToken,
  authorizeRoles([1]),
  userController.createUser
);
router.put(
  '/:uuid',
  authenticateToken,
  authorizeRoles([1]),
  userController.updateUserByUuid
);
router.delete(
  '/:uuid',
  authenticateToken,
  authorizeRoles([1]),
  userController.deleteUserByUuid
);

module.exports = router;
