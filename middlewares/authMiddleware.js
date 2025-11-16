const jwt = require('jsonwebtoken');
const { User } = require('../models');
require('dotenv').config();

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; 

    if (!token) {
      return res.status(401).json({ message: 'Token tidak ditemukan' });
    }

    // Verify JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Cek user exists dan ambil data role terbaru
    const user = await User.findByPk(decoded.id, {
      include: [
        {
          association: 'role',
          attributes: ['name'],
        },
      ],
    });

    if (!user) {
      return res.status(401).json({ message: 'User tidak ditemukan' });
    }

    // Simpan data user yang lengkap (dengan role dari database)
    req.userId = user.id;
    req.user = {
      id: user.id,
      uuid: user.uuid,
      role: user.role.name, 
      email: user.email,
      name: user.name,
    };

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }

    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Token invalid' });
    }

    console.error('Token verification error:', err);
    return res.status(401).json({ message: 'Token tidak valid' });
  }
};

// Middleware untuk cek role
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const userRole = req.user.role;

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        message: 'Akses ditolak. Role tidak diizinkan.',
      });
    }

    next();
  };
};

// Middleware khusus untuk admin saja
const requireAdmin = requireRole(['admin']);

// Middleware untuk admin dan customer
const requireAuth = requireRole(['admin', 'customer']);

module.exports = {
  authenticateToken,
  requireRole,
  requireAdmin,
  requireAuth,
};
