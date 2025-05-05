const { User, Role } = require('../models');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token =  authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Token tidak ditemukan' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Token invalid' });
    }
    req.user = user;
    next();
  });
}

const authorizeRoles = (allowedRoles) => {
  return async (req, res, next) => {
    try {
      const user = await User.findByPk(req.user.id, {
        include: { model: Role, attributes: ['id', 'name'] },
      });

      if (!user || !user.Role) {
        return res
          .status(403)
          .json({ message: 'User tidak ditemukan atau tidak memiliki role!' });
      }

      const userRoleId = user.Role.id;
      const userRoleName = user.Role.name;

      const isAllowed = allowedRoles.includes(userRoleId);

      if (!isAllowed) {
        return res.status(403).json({
          message: `Akses ditolak. Role '${userRoleName}' tidak memiliki izin.`,
        });
      }

      next();
    } catch (error) {
      console.error('Authorization error:', error);
      res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
  }
}

module.exports = { authenticateToken, authorizeRoles };