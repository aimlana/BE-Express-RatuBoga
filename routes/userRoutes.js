const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middlewares/authMiddleware');

// Routes for admin
router.use(
  authMiddleware.authenticateToken,
  authMiddleware.authorizeRoles([1])
);

router.post('/', userController.createUser);

router.get('/', userController.getAllUsers);
router.get('/:uuid', userController.getUserByUuid);
router.put('/:uuid', userController.updateUserByUuid);
router.delete('/:uuid', userController.deleteUserByUuid);

module.exports = router;
