const { User, Auth, Role } = require('../models');
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');

// Get user profile - PERBAIKI QUERY INI
const getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.userId, {
      attributes: [
        'id',
        'uuid',
        'name',
        'email',
        'role_id',
        'createdAt',
      ],
      include: [
        {
          model: Role,
          as: 'role',
          attributes: ['id', 'name', 'description'],
        },
      ],
    });

    if (!user) {
      return res.status(404).json({ message: 'User tidak ditemukan' });
    }

    // Get last login from Auth table separately
    const authData = await Auth.findOne({
      where: { user_id: req.userId },
      attributes: ['createdAt'],
      order: [['createdAt', 'DESC']],
    });

    res.json({
      id: user.id,
      uuid: user.uuid,
      name: user.name,
      email: user.email,
      role: user.role.name,
      role_description: user.role.description,
      created_at: user.createdAt,
      last_login: authData?.createdAt || null,
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
};

// Update profile - TETAP SAMA
const updateProfile = async (req, res) => {
  const { name, email } = req.body;

  try {
    // Validasi input
    if (!name || !email) {
      return res.status(400).json({
        message: 'Nama, email, dan nomor telepon harus diisi',
      });
    }

    const user = await User.findByPk(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User tidak ditemukan' });
    }

    // Check if email already exists (excluding current user)
    if (email !== user.email) {
      const existingEmail = await User.findOne({
        where: {
          email,
          id: { [Op.ne]: req.userId },
        },
      });
      if (existingEmail) {
        return res
          .status(400)
          .json({ message: 'Email sudah digunakan oleh user lain' });
      }
    }

    // Update user data
    await user.update({
      name: name.trim(),
      email: email.trim(),
    });

    // Get updated user data with role
    const updatedUser = await User.findByPk(req.userId, {
      attributes: ['id', 'name', 'email'],
      include: [
        {
          model: Role,
          as: 'role',
          attributes: ['name'],
        },
      ],
    });

    res.json({
      message: 'Profil berhasil diperbarui',
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role.name,
      },
    });
  } catch (error) {
    console.error('Update profile error:', error);

    if (error.name === 'SequelizeValidationError') {
      const errors = error.errors.map((err) => err.message);
      return res.status(400).json({ message: 'Validasi gagal', errors });
    }

    res.status(500).json({ message: 'Terjadi kesalahan saat update profil' });
  }
};

// Change password - TETAP SAMA
const changePassword = async (req, res) => {
  const { current_password, new_password, confirm_password } = req.body;

  try {
    // Validasi input
    if (!current_password || !new_password || !confirm_password) {
      return res.status(400).json({
        message:
          'Password saat ini, password baru, dan konfirmasi password harus diisi',
      });
    }

    if (new_password !== confirm_password) {
      return res
        .status(400)
        .json({ message: 'Password baru dan konfirmasi password tidak sama' });
    }

    if (new_password.length < 6) {
      return res
        .status(400)
        .json({ message: 'Password baru minimal 6 karakter' });
    }

    // Get auth data
    const auth = await Auth.findOne({ where: { user_id: req.userId } });
    if (!auth) {
      return res
        .status(404)
        .json({ message: 'Data autentikasi tidak ditemukan' });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(current_password, auth.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Password saat ini salah' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(new_password, 10);
    await auth.update({ password: hashedPassword });

    res.json({ message: 'Password berhasil diubah' });
  } catch (error) {
    console.error('Change password error:', error);
    res
      .status(500)
      .json({ message: 'Terjadi kesalahan saat mengubah password' });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  changePassword,
};
